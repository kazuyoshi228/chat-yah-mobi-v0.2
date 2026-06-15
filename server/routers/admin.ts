import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createQuickReply,
  createRagDocument,
  deleteQuickReply,
  deleteRagDocument,
  getAllOperators,
  getKpiStats,
  listQuickReplies,
  listRagDocuments,
  updateQuickReply,
  updateRagDocument,
  updateUserRole,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { getEmbedding } from "./ai";

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
    return getAllOperators();
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
});
