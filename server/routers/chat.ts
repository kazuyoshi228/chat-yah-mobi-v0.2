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
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { generateAIResponse, generateSummary } from "./ai";
import { notifyOwner } from "../_core/notification";
import { getIo } from "../socket";

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

      // Notify owner
      await notifyOwner({
        title: "新規チャット開始",
        content: `${input.visitorName ?? "訪問者"} がチャットを開始しました。\n最初のメッセージ: ${input.initialMessage}`,
      }).catch(() => {});

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
        comment: z.string().optional(),
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
        comment: input.comment,
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

      return { success: true };
    }),
});
