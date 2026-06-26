import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { improvementCards } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const improvementsRouter = router({
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(improvementCards);
  }),

  update: protectedProcedure
    .input(
      z.object({
        cardKey: z.string(),
        nextDate: z.string().nullable(),
        lastDate: z.string().nullable(),
        notes: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db
        .update(improvementCards)
        .set({
          nextDate: input.nextDate ? new Date(input.nextDate) : null,
          lastDate: input.lastDate ? new Date(input.lastDate) : null,
          notes: input.notes ?? null,
        })
        .where(eq(improvementCards.cardKey, input.cardKey));
      return { success: true };
    }),
});
