import { z } from "zod";
import {
  createOperatorUser,
  createQuickReply,
  createRagDocument,
  deleteQuickReply,
  deleteRagDocument,
  getAllOperators,
  getAllOperatorsWithChatCount,
  getAnalysisData,
  getChatSession,
  getKpiStats,
  getMessagesBySessionId,
  getOperatorChatCount,
  listChatSessions,
  listQuickReplies,
  listRagDocuments,
  listSurveys,
  createMessage,
  scheduleSessionDeletion,
  updateChatSession,
  updateOperatorProfile,
  updateQuickReply,
  updateRagDocument,
  updateUserRole,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getEmbedding, generateSummary } from "./ai";
import { invokeLLM } from "../_core/llm";
import { getIo } from "../socket";

// Middleware: require admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // KPI stats
  getKpi: adminProcedure
    .input(
      z.object({
        period: z.enum(["all", "today", "week", "month"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      let since: Date | undefined;
      const now = new Date();
      if (input.period === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (input.period === "week") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (input.period === "month") {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      return getKpiStats(since);
    }),

  // Operator management
  listOperators: adminProcedure.query(async () => {
    // B-4: Use single-query helper to avoid N+1 (one COUNT per operator)
    return getAllOperatorsWithChatCount();
  }),

  createOperator: adminProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createOperatorUser(input);
      return { id };
    }),

  updateOperator: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, ...data } = input;
      await updateOperatorProfile(userId, data);
      return { success: true };
    }),

  deleteOperator: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, "user");
      return { success: true };
    }),

  setUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "operator"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),

  // Quick reply management
  listQuickReplies: adminProcedure.query(async () => {
    return listQuickReplies();
  }),

  createQuickReply: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createQuickReply(input);
      return { id };
    }),

  updateQuickReply: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateQuickReply(id, data);
      return { success: true };
    }),

  deleteQuickReply: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteQuickReply(input.id);
      return { success: true };
    }),

  // RAG document management
  listRagDocuments: adminProcedure.query(async () => {
    return listRagDocuments();
  }),

  createRagDocument: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        expiresAt: z.string().datetime().optional(), // ISO 8601 string
      })
    )
    .mutation(async ({ input }) => {
      // Generate embedding for the document
      const embedding = await getEmbedding(`${input.title}\n${input.content}`);
      const id = await createRagDocument({
        title: input.title,
        content: input.content,
        embedding: embedding.length > 0 ? embedding : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });
      return { id };
    }),

  updateRagDocument: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        expiresAt: z.string().datetime().nullable().optional(), // null = clear expiry
      })
    )
    .mutation(async ({ input }) => {
      const { id, expiresAt, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (expiresAt !== undefined) {
        updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }
      // Re-generate embedding if content changed
      if (data.content || data.title) {
        const doc = await listRagDocuments().then((docs) => docs.find((d) => d.id === id));
        if (doc) {
          const title = data.title ?? doc.title;
          const content = data.content ?? doc.content;
          const embedding = await getEmbedding(`${title}\n${content}`);
          await updateRagDocument(id, {
            ...updateData,
            embedding: embedding.length > 0 ? embedding : undefined,
          } as Parameters<typeof updateRagDocument>[1]);
        }
      } else {
        await updateRagDocument(id, updateData as Parameters<typeof updateRagDocument>[1]);
      }
      return { success: true };
    }),

  deleteRagDocument: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRagDocument(input.id);
      return { success: true };
    }),

  // Feedback (survey) list
  listFeedback: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }))
    .query(async ({ input }) => {
      return listSurveys(input.limit);
    }),

  // ── Chat Management (Admin can reply to Waiting/Active sessions) ──
  listChats: adminProcedure
    .input(z.object({ status: z.enum(["waiting", "active", "ended", "all"]).optional() }))
    .query(async ({ input }) => {
      const status = input.status === "all" ? undefined : input.status;
      return listChatSessions(status);
    }),

  getChatDetail: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const messages = await getMessagesBySessionId(input.sessionId);
      const quickReplies = await listQuickReplies();
      return { session, messages, quickReplies };
    }),

  sendChatMessage: adminProcedure
    .input(z.object({ sessionId: z.number(), content: z.string(), fileUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!input.content.trim() && !input.fileUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message content or file is required" });
      }
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      // B-7: Reject messages to ended sessions
      if (session.status === "ended") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This chat session has already ended.",
        });
      }
      // Auto-assign admin and set status=active so AI stops responding to visitor messages
      await updateChatSession(input.sessionId, {
        status: "active",
        operatorId: session.operatorId ?? ctx.user.id,
      });
      const msgId = await createMessage({
        sessionId: input.sessionId,
        role: "operator",
        senderId: ctx.user.id, // 5.2: track which admin sent the message
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

  assignChat: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      await updateChatSession(input.sessionId, { status: "active", operatorId: ctx.user.id });
      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("operator_joined", {
          sessionId: input.sessionId,
          operatorName: ctx.user.name,
        });
        io.to("operators").emit("session_assigned", { sessionId: input.sessionId, operatorId: ctx.user.id });
      }
      return { success: true };
    }),

  endChat: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getChatSession(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(history.map((m) => ({ role: m.role, content: m.content })));
      // Preserve existing operatorId if already assigned; otherwise set admin as operator
      const updateData: Parameters<typeof updateChatSession>[1] = { status: "ended", summary };
      if (!session.operatorId) {
        updateData.operatorId = ctx.user.id;
      }
      await updateChatSession(input.sessionId, updateData);

      // A-5: Data retention — schedule deletion 2 years from now
      await scheduleSessionDeletion(input.sessionId).catch(() => {});

      const io = getIo();
      if (io) {
        io.to(`session:${input.sessionId}`).emit("session_ended", { sessionId: input.sessionId });
        io.to("operators").emit("session_ended", { sessionId: input.sessionId });
      }
      return { success: true };
    }),

  refreshChatSummary: adminProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const history = await getMessagesBySessionId(input.sessionId);
      const summary = await generateSummary(history.map((m) => ({ role: m.role, content: m.content })));
      await updateChatSession(input.sessionId, { summary });
      return { summary };
    }),

  // Data Analysis
  getAnalysis: adminProcedure
    .input(
      z.object({
        period: z.enum(["all", "today", "week", "month"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      let since: Date | undefined;
      const now = new Date();
      if (input.period === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (input.period === "week") {
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (input.period === "month") {
        since = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const { sessions, messages } = await getAnalysisData(since);

      // AI vs Operator breakdown
      const aiSessions = sessions.filter((s) => !s.operatorId);
      const operatorSessions = sessions.filter((s) => !!s.operatorId);

      // Language breakdown
      const langMap: Record<string, number> = {};
      for (const s of sessions) {
        const lang = s.language ?? "unknown";
        langMap[lang] = (langMap[lang] ?? 0) + 1;
      }
      const languageBreakdown = Object.entries(langMap)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count);

      // Status breakdown
      const statusMap: Record<string, number> = {};
      for (const s of sessions) {
        statusMap[s.status] = (statusMap[s.status] ?? 0) + 1;
      }

      // Daily trend (last 30 days)
      const dailyMap: Record<string, { ai: number; operator: number }> = {};
      for (const s of sessions) {
        const day = s.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { ai: 0, operator: 0 };
        if (s.operatorId) dailyMap[day].operator++;
        else dailyMap[day].ai++;
      }
      const dailyTrend = Object.entries(dailyMap)
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

      // Message role breakdown
      const senderMap: Record<string, number> = {};
      for (const m of messages) {
        senderMap[m.role] = (senderMap[m.role] ?? 0) + 1;
      }

      // Hourly distribution
      const hourlyMap: Record<number, number> = {};
      for (const s of sessions) {
        const hour = s.createdAt.getHours();
        hourlyMap[hour] = (hourlyMap[hour] ?? 0) + 1;
      }
      const hourlyDistribution = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        count: hourlyMap[h] ?? 0,
      }));

      // Category analysis: classify visitor messages using LLM
      // Sample up to 80 visitor messages to avoid excessive LLM calls
      const visitorMessages = messages
        .filter((m) => m.role === "visitor")
        .slice(0, 80)
        .map((m) => m.content.slice(0, 200));

      let categoryBreakdown: { category: string; count: number; examples: string[] }[] = [];
      if (visitorMessages.length > 0) {
        try {
          const prompt = `You are a customer support analyst. Classify each of the following customer inquiry messages into one of these categories: Pricing, Booking/Reservation, Technical Issue, Shipping/Delivery, Account/Login, Product Info, Cancellation/Refund, General Inquiry, Other.

Messages (one per line):
${visitorMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Return a JSON object with this exact shape:
{
  "categories": [
    { "category": "<category name>", "indices": [<1-based message indices>] }
  ]
}
Do not include any other text.`;

          const resp = await invokeLLM({
            model: "gpt-4o-mini",
            messages: [{ role: "user" as const, content: prompt as string }],
            response_format: { type: "json_object" },
          });
          const rawContent = resp.choices?.[0]?.message?.content;
          const raw = typeof rawContent === "string" ? rawContent : "{}";
          const parsed = JSON.parse(raw) as { categories: { category: string; indices: number[] }[] };
          categoryBreakdown = (parsed.categories ?? []).map((c) => ({
            category: c.category,
            count: c.indices.length,
            examples: c.indices.slice(0, 3).map((i) => visitorMessages[i - 1] ?? "").filter(Boolean),
          })).sort((a, b) => b.count - a.count);
        } catch (e) {
          console.warn("[Analysis] Category classification failed:", e);
          categoryBreakdown = [];
        }
      }

      return {
        total: sessions.length,
        aiCount: aiSessions.length,
        operatorCount: operatorSessions.length,
        languageBreakdown,
        statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
        dailyTrend,
        senderBreakdown: Object.entries(senderMap).map(([sender, count]) => ({ sender, count })),
        hourlyDistribution,
        categoryBreakdown,
        analyzedMessageCount: visitorMessages.length,
      };
    }),

  // Real-time counts for dashboard alert section
  getActiveCounts: adminProcedure
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
});
