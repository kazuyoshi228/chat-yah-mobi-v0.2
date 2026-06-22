import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMessage,
  getChatSession,
  getMessagesBySessionId,
  getSurveyBySessionId,
  getUnreadSessionIds,
  listChatSessions,
  listQuickReplies,
  markSessionRead,
  scheduleSessionDeletion,
  updateChatSession,
  updateSessionLastMessageAt,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { generateSummary } from "./ai";
import { getIo } from "../socket";
import { translateFromJapaneseWithResult } from "../_core/deepl";

// Middleware: require operator or admin role
const operatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "operator" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Operator access required" });
  }
  return next({ ctx });
});

export const operatorRouter = router({
  // List all chat sessions with optional status filter
  listSessions: operatorProcedure
    .input(
      z.object({
        status: z.enum(["waiting", "active", "ended"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return listChatSessions(input.status);
    }),

  // Get session detail with messages and survey
  getSessionDetail: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const msgs = await getMessagesBySessionId(input.sessionId);
      const survey = await getSurveyBySessionId(input.sessionId);
      return { session, messages: msgs, survey: survey ?? null };
    }),

  // Assign operator to session
  assignSession: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      await updateChatSession(input.sessionId, {
        status: "active",
        operatorId: ctx.user.id,
      });

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("operator_joined", {
          sessionId: input.sessionId,
          operatorName: ctx.user.name,
        });
        io.to("operators").emit("session_assigned", {
          sessionId: input.sessionId,
          operatorId: ctx.user.id,
        });
      }

      return { success: true };
    }),

  // Send operator message
  // Only the assigned operator (or any admin) may send messages to a session.
  sendMessage: operatorProcedure
    .input(
      z.object({
        sessionId: z.number(),
        content: z.string(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!input.content.trim() && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message content or file is required" });
      }
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      // Auto-assign: if no operator is assigned yet, assign this operator
      if (!session.operatorId) {
        await updateChatSession(input.sessionId, {
          status: "active",
          operatorId: ctx.user.id,
        });
        const io = getIo();
        if (io) {
          io.to(`session:${input.sessionId}`).emit("operator_joined", {
            sessionId: input.sessionId,
            operatorName: ctx.user.name,
          });
          io.to("operators").emit("session_assigned", {
            sessionId: input.sessionId,
            operatorId: ctx.user.id,
          });
        }
      } else if (ctx.user.role !== "admin" && session.operatorId !== ctx.user.id) {
        // Another operator is already assigned — block
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This session is already assigned to another operator.",
        });
      }

      // Layer 2: Auto-translate operator message to visitor's language (server-side)
      const sessionLang = session.language ?? "ja";
      const txResult = await translateFromJapaneseWithResult(
        input.content,
        sessionLang
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const translatedContent = txResult.ok ? txResult.text : null;
      const translationLabel = txResult.ok
        ? txResult.text
        : txResult.reason === "skipped"
        ? null
        : txResult.reason === "quota_exceeded"
        ? "[翻訳上限に達しました]"
        : "[翻訳できませんでした]";

      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "operator",
        senderId: ctx.user.id,
        content: input.content,
        translation: translationLabel ?? undefined,
        fileUrl: input.fileUrl,
      });
      await updateSessionLastMessageAt(input.sessionId);

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: msgId,
          sessionId: input.sessionId,
          role: "operator",
          // Visitor sees translated text (or original if translation failed)
          content: translatedContent ?? input.content,
          originalContent: input.content,
          translation: translationLabel ?? null,
          fileUrl: input.fileUrl,
          operatorName: ctx.user.name,
          createdAt: new Date(),
        });
      }

      return { success: true, messageId: msgId };
    }),

  // End session by operator
  endSession: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      await updateChatSession(input.sessionId, { status: "ended", summary });

      // Data retention: schedule deletion 2 years from now (GDPR / 個人情報保護法対応)
      await scheduleSessionDeletion(input.sessionId).catch(() => {});

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("session_ended", {
          sessionId: input.sessionId,
        });
        io.to("operators").emit("session_ended", { sessionId: input.sessionId });
      }

      return { success: true };
    }),

  // Generate/refresh summary
  generateSummary: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(
        history.map((m) => ({ role: m.role, content: m.content }))
      );
      await updateChatSession(input.sessionId, { summary });
      return { summary };
    }),

  // Typing indicator
  typing: operatorProcedure
    .input(z.object({ sessionId: z.number(), isTyping: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("typing", {
          role: "operator",
          name: ctx.user.name,
          isTyping: input.isTyping,
        });
      }
      return { success: true };
    }),

  // Quick replies
  listQuickReplies: operatorProcedure.query(async () => {
    return listQuickReplies();
  }),

  // Real-time counts for operator dashboard
  getActiveCounts: operatorProcedure
    .query(async () => {
      const [waiting, active] = await Promise.all([
        listChatSessions("waiting"),
        listChatSessions("active"),
      ]);
      return {
        waiting: waiting.length,
        active: active.length,
      };
    }),

  // Mark a session as read by the current user
  markRead: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markSessionRead(ctx.user.id, input.sessionId);
      return { ok: true };
    }),

  // Get set of unread session IDs for the current user
  getUnreadSessionIds: operatorProcedure
    .query(async ({ ctx }) => {
      const ids = await getUnreadSessionIds(ctx.user.id);
      return { unreadIds: Array.from(ids) };
    }),
});
