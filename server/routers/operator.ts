import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createMessage,
  getChatSession,
  getMessagesBySessionId,
  listChatSessions,
  listQuickReplies,
  updateChatSession,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { generateSummary } from "./ai";
import { getIo } from "../socket";

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

  // Get session detail with messages
  getSessionDetail: operatorProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const msgs = await getMessagesBySessionId(input.sessionId);
      return { session, messages: msgs };
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
  sendMessage: operatorProcedure
    .input(
      z.object({
        sessionId: z.number(),
        content: z.string().min(1),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "operator",
        content: input.content,
        fileUrl: input.fileUrl,
      });

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("new_message", {
          id: msgId,
          sessionId: input.sessionId,
          role: "operator",
          content: input.content,
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
});
