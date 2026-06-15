import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createChatSession,
  createMessage,
  getChatSession,
  getChatSessionByVisitorId,
  getMessagesBySessionId,
  updateChatSession,
  createSurvey,
  getSurveyBySessionId,
  scheduleSessionDeletion,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { generateAIResponse, generateSummary } from "./ai";
import { notifyOwner } from "../_core/notification";
import { getIo } from "../socket";
import { sendEscalationEmail, sendNewChatEmail } from "../email";
import { getAllOperators } from "../db";

export const chatRouter = router({
  // Start a new chat session or resume existing one
  startSession: publicProcedure
    .input(
      z.object({
        visitorId: z.string().min(1),
        visitorName: z.string().optional(),
        visitorEmail: z.string().email().optional(),
        initialMessage: z.string().min(1),
        language: z.enum(["ja", "en", "zh", "es", "ko"]).default("ja"),
      })
    )
    .mutation(async ({ input }) => {
      // Check for existing active session
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

      // Save visitor's first message
      await createMessage({
        sessionId,
        role: "visitor",
        content: input.initialMessage,
      });

      // Generate AI response
      const { content: aiContent, shouldEscalate } = await generateAIResponse(
        sessionId,
        input.initialMessage,
        [],
        input.language
      );

      await createMessage({
        sessionId,
        role: "ai",
        content: aiContent,
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

      // Send email notification to all operators if escalation is needed
      if (shouldEscalate) {
        const operators = await getAllOperators().catch(() => []);
        const appUrl = process.env.VITE_FRONTEND_FORGE_API_URL
          ? "https://chat.yah.mobi"
          : "https://chat.yah.mobi";
        await Promise.allSettled(
          operators
            .filter((op) => op.email)
            .map((op) =>
              sendEscalationEmail({
                toEmail: op.email!,
                operatorName: op.firstName
                  ? `${op.firstName} ${op.lastName ?? ""}`.trim()
                  : (op.name ?? "Operator"),
                sessionId,
                visitorName: input.visitorName,
                language: input.language,
                urgent: true,
                appUrl,
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

  // Get messages for a session
  getMessages: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return getMessagesBySessionId(input.sessionId);
    }),

  // Send a visitor message and get AI response
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.number(),
        visitorId: z.string(),
        content: z.string().min(1),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      if (session.visitorId !== input.visitorId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Save visitor message
      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "visitor",
        content: input.content,
        fileUrl: input.fileUrl,
      });

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: msgId,
          sessionId: input.sessionId,
          role: "visitor",
          content: input.content,
          fileUrl: input.fileUrl,
          createdAt: new Date(),
        });
      }

      // If operator is assigned, don't auto-reply
      if (session.status === "active" && session.operatorId) {
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

      const aiMsgId = await createMessage({
        sessionId: input.sessionId,
        role: "ai",
        content: aiContent,
      });

      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: aiMsgId,
          sessionId: input.sessionId,
          role: "ai",
          content: aiContent,
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

      // Send escalation email to all operators with email addresses
      const operators = await getAllOperators().catch(() => []);
      await Promise.allSettled(
        operators
          .filter((op) => op.email)
          .map((op) =>
            sendEscalationEmail({
              toEmail: op.email!,
              operatorName: op.firstName
                ? `${op.firstName} ${op.lastName ?? ""}`.trim()
                : (op.name ?? "Operator"),
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
});
