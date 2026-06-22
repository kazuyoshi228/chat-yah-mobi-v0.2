import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChatSession,
  createMessage,
  getChatSession,
  getChatSessionByVisitorId,
  getMessagesBySessionId,
  updateChatSession,
  updateSessionLastMessageAt,
  createSurvey,
  getSurveyBySessionId,
  scheduleSessionDeletion,
  listQuickReplies,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { generateAIResponse, generateSummary } from "./ai";
import { notifyOwner } from "../_core/notification";
import { getIo } from "../socket";
import { sendEscalationEmail, sendNewChatEmail } from "../email";
import { getAllAdmins } from "../db";
import { translateToJapaneseWithResult } from "../_core/deepl";

export const chatRouter = router({
  // Start a new chat session or resume existing one
  startSession: publicProcedure
    .input(
      z.object({
        visitorId: z.string().min(1),
        visitorName: z.string().optional(),
        visitorEmail: z.string().email().optional(),
        initialMessage: z.string().min(1),
        language: z.enum(["ja", "en", "zh", "ko", "th", "vi"]).default("ja"),
      })
    )
    .mutation(async ({ input }) => {
      // 5.3: Race condition guard — re-check after first lookup to prevent duplicate sessions
      // Pattern: check → create → re-check (handles concurrent requests from the same visitor)
      const existing = await getChatSessionByVisitorId(input.visitorId);
      if (existing && existing.status !== "ended") {
        return { sessionId: existing.id, isNew: false };
      }

      // Create new session
      const sessionId = await createChatSession({
        visitorId: input.visitorId,
        visitorName: input.visitorName,
        visitorEmail: input.visitorEmail,
        status: "waiting",
        language: input.language,
      });

      // 5.3: Post-insert re-check — if a concurrent request created a session first,
      // return the earliest active session to avoid duplicates
      const concurrent = await getChatSessionByVisitorId(input.visitorId);
      if (concurrent && concurrent.id !== sessionId && concurrent.status !== "ended") {
        // Another session was created concurrently; discard ours (it will be cleaned up by purge)
        await updateChatSession(sessionId, { status: "ended" });
        return { sessionId: concurrent.id, isNew: false };
      }

      // Save visitor's first message (with translation if non-Japanese)
      const initialTxResult = await translateToJapaneseWithResult(
        input.initialMessage,
        input.language
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const initialTranslation = initialTxResult.ok
        ? initialTxResult.text
        : initialTxResult.reason === "skipped"
        ? undefined
        : "[翻訳できませんでした]"; // fallback label for operators
      await createMessage({
        sessionId,
        role: "visitor",
        content: input.initialMessage,
        translation: initialTranslation,
      });

      // Generate AI response
      const { content: aiContent, shouldEscalate } = await generateAIResponse(
        sessionId,
        input.initialMessage,
        [],
        input.language
      );

      // Translate AI response to Japanese for operator display (skip if already Japanese)
      const aiTxResult0 = await translateToJapaneseWithResult(
        aiContent,
        input.language
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const aiTranslation0 = aiTxResult0.ok
        ? aiTxResult0.text
        : aiTxResult0.reason === "skipped"
        ? undefined
        : "[翻訳できませんでした]";

      await createMessage({
        sessionId,
        role: "ai",
        content: aiContent,
        translation: aiTranslation0,
      });

      // Notify via socket
      const io = getIo();
      if (io) {
        io.to("operators").emit("new_session", {
          sessionId,
          visitorName: input.visitorName,
          language: input.language,
          shouldEscalate,
        });
      }

      // Notify owner (Manus platform notification)
      await notifyOwner({
        title: "新規チャット開始",
        content: `${input.visitorName ?? "訪問者"} がチャットを開始しました。\n最初のメッセージ: ${input.initialMessage}`,
      }).catch(() => {});

      // Send email notification to admins if escalation is needed
      if (shouldEscalate) {
        const admins = await getAllAdmins().catch(() => []);
        await Promise.allSettled(
          admins
            .filter((a) => a.email)
            .map((a) =>
              sendEscalationEmail({
                toEmail: a.email!,
                operatorName: a.name ?? "Admin",
                sessionId,
                visitorName: input.visitorName,
                language: input.language,
                urgent: true,
                appUrl: "https://chat.yah.mobi",
              })
            )
        );
      }

      return { sessionId, isNew: true, aiResponse: aiContent, shouldEscalate };
    }),

  // Get session info
  getSession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      return session;
    }),

  // Get messages for a session.
  // Visitors must supply their visitorId to prove ownership.
  // Operators/admins (authenticated users) can access any session.
  getMessages: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string().optional(), // required for unauthenticated visitors
      })
    )
    .query(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const isOperatorOrAdmin =
        ctx.user && (ctx.user.role === "operator" || ctx.user.role === "admin");

      if (!isOperatorOrAdmin) {
        if (!input.visitorId || session.visitorId !== input.visitorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Visitor ID does not match this session.",
          });
        }
      }

      const msgs = await getMessagesBySessionId(input.sessionId);

      // For visitors: remap operator messages so they see translated content
      if (!isOperatorOrAdmin) {
        return msgs.map((m) => {
          if (m.role === "operator" && m.translation) {
            return { ...m, content: m.translation, translation: null };
          }
          return m;
        });
      }

      return msgs;
    }),

  // Send a visitor message and get AI response
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
        content: z.string(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Require either content or fileUrl
      if (!input.content.trim() && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message content or image required" });
      }
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // B-6: Reject messages to ended sessions
      if (session.status === "ended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This chat session has ended.",
        });
      }

      // Save visitor message (with translation if non-Japanese)
      const visitorTxResult = await translateToJapaneseWithResult(
        input.content,
        session.language ?? "ja"
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const visitorTranslation = visitorTxResult.ok
        ? visitorTxResult.text
        : visitorTxResult.reason === "skipped"
        ? null
        : "[翻訳できませんでした]"; // fallback label for operators
      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "visitor",
        content: input.content,
        translation: visitorTranslation ?? undefined,
        fileUrl: input.fileUrl,
      });
      await updateSessionLastMessageAt(input.sessionId);

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: msgId,
          sessionId: input.sessionId,
          role: "visitor",
          content: input.content,
          translation: visitorTranslation ?? null,
          fileUrl: input.fileUrl,
          createdAt: new Date(),
        });
      }

      // If operator is assigned OR session is active (operator taking over), don't auto-reply
      if (session.status === "active" || session.operatorId) {
        return { aiResponse: null, shouldEscalate: false };
      }

      // Get conversation history for context
      const history = await getMessagesBySessionId(input.sessionId);

      // Generate AI response
      const { content: aiContent, shouldEscalate } = await generateAIResponse(
        input.sessionId,
        input.content,
        history.map((m) => ({ role: m.role, content: m.content })),
        session.language ?? "ja"
      );

      // Translate AI response to Japanese for operator display (skip if already Japanese)
      const aiTxResult = await translateToJapaneseWithResult(
        aiContent,
        session.language ?? "ja"
      ).catch(() => ({ ok: false as const, reason: "network_error" as const }));
      const aiTranslation = aiTxResult.ok
        ? aiTxResult.text
        : aiTxResult.reason === "skipped"
        ? undefined
        : "[翻訳できませんでした]";

      const aiMsgId = await createMessage({
        sessionId: input.sessionId,
        role: "ai",
        content: aiContent,
        translation: aiTranslation,
      });

      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: aiMsgId,
          sessionId: input.sessionId,
          role: "ai",
          content: aiContent,
          translation: aiTranslation ?? null,
          createdAt: new Date(),
        });

        if (shouldEscalate) {
          io.to(`session:${input.sessionId}`).emit("escalation_suggested", {
            sessionId: input.sessionId,
          });
          io.to("operators").emit("escalation_alert", {
            sessionId: input.sessionId,
            visitorName: session.visitorName,
          });
        }
      }

      return { aiResponse: aiContent, shouldEscalate };
    }),

  // End a session
  endSession: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Generate summary
      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(
        history.map((m) => ({ role: m.role, content: m.content }))
      );

      await updateChatSession(input.sessionId, { status: "ended", summary });

      // Data retention: schedule deletion 2 years from now (GDPR/個人情報保護法対応)
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

  // Submit post-chat survey
  submitSurvey: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
        rating: z.number().min(1).max(5),
        resolved: z.enum(["yes", "no"]).optional(),
        comment: z.string().optional(),
        freeComment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check if survey already submitted
      const existing = await getSurveyBySessionId(input.sessionId);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Survey already submitted" });

      await createSurvey({
        sessionId: input.sessionId,
        rating: input.rating,
        resolved: input.resolved,
        comment: input.comment,
        freeComment: input.freeComment,
      });

      // Notify operators via Socket.io that survey has been submitted
      const io = getIo();
      if (io) {
        const surveyPayload = {
          sessionId: input.sessionId,
          rating: input.rating,
          resolved: input.resolved ?? null,
          freeComment: input.freeComment ?? null,
          submittedAt: new Date(),
        };
        // Notify the session room (operator viewing this specific chat)
        io.to(`session:${input.sessionId}`).emit("survey_submitted", surveyPayload);
        // Also notify all operators (for list view updates)
        io.to("operators").emit("survey_submitted", surveyPayload);
      }

      return { success: true };
    }),

  // Request escalation to operator
  requestEscalation: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const io = getIo();
      if (io) {
        io.to("operators").emit("escalation_alert", {
          sessionId: input.sessionId,
          visitorName: session.visitorName,
          urgent: true,
        });
      }

      // Send escalation email to admins only
      const admins = await getAllAdmins().catch(() => []);
      await Promise.allSettled(
        admins
          .filter((a) => a.email)
          .map((a) =>
            sendEscalationEmail({
              toEmail: a.email!,
              operatorName: a.name ?? "Admin",
              sessionId: input.sessionId,
              visitorName: session.visitorName,
              language: session.language,
              urgent: true,
              appUrl: "https://chat.yah.mobi",
            })
          )
      );

      return { success: true };
    }),

  // Public read-only quick replies (used by operator and admin panels)
  listQuickReplies: publicProcedure.query(async () => {
    return listQuickReplies();
  }),
});
