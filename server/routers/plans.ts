/**
 * Plans router — read-only for admin UI (data comes via Webhook from yah.mobi/app)
 * Also exposes public endpoint for yah.mobi/app to fetch current plan list
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  plans,
  competitorPlans,
  customerProfiles,
  purchases,
  esimStatuses,
  esimIncidents,
} from "../../drizzle/schema";
import { desc, eq, and } from "drizzle-orm";

export const plansRouter = router({
  // ── Public: yah.mobi/app can call this to verify sync ──────────────────────
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(plans).orderBy(plans.sortOrder);
  }),

  competitorList: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(competitorPlans).orderBy(competitorPlans.competitorName);
  }),

  // ── Admin: customer profiles ────────────────────────────────────────────────
  customerProfiles: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const items = await db
        .select()
        .from(customerProfiles)
        .orderBy(desc(customerProfiles.syncedAt))
        .limit(input.limit)
        .offset(input.offset);
      return { items };
    }),

  // ── Admin: purchase history ─────────────────────────────────────────────────
  purchases: protectedProcedure
    .input(z.object({
      externalUserId: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const query = db
        .select()
        .from(purchases)
        .orderBy(desc(purchases.purchasedAt))
        .limit(input.limit)
        .offset(input.offset);
      const items = await query;
      return { items };
    }),

  // ── Admin: eSIM statuses ────────────────────────────────────────────────────
  esimStatuses: protectedProcedure
    .input(z.object({
      externalUserId: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const items = await db
        .select()
        .from(esimStatuses)
        .orderBy(desc(esimStatuses.syncedAt))
        .limit(input.limit);
      return { items };
    }),

  // ── Admin: eSIM incidents (refund tracking) ───────────────────────────────
  incidents: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        status: z
          .enum(["pending", "processing", "refunded", "failed", "not_required", "all"])
          .default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const baseQuery = db
        .select()
        .from(esimIncidents)
        .orderBy(desc(esimIncidents.detectedAt))
        .limit(input.limit)
        .offset(input.offset);
      const items =
        input.status !== "all"
          ? await db
              .select()
              .from(esimIncidents)
              .where(eq(esimIncidents.refundStatus, input.status as any))
              .orderBy(desc(esimIncidents.detectedAt))
              .limit(input.limit)
              .offset(input.offset)
          : await baseQuery;
      return { items };
    }),

  // ── Admin: customer detail (profile + purchases + esim) ────────────────────
  customerDetail: protectedProcedure
    .input(z.object({ externalUserId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [profile] = await db
        .select()
        .from(customerProfiles)
        .where(eq(customerProfiles.externalUserId, input.externalUserId))
        .limit(1);
      const userPurchases = await db
        .select()
        .from(purchases)
        .where(eq(purchases.externalUserId, input.externalUserId))
        .orderBy(desc(purchases.purchasedAt));
      const userEsim = await db
        .select()
        .from(esimStatuses)
        .where(eq(esimStatuses.externalUserId, input.externalUserId))
        .orderBy(desc(esimStatuses.syncedAt));
      return { profile: profile ?? null, purchases: userPurchases, esimStatuses: userEsim };
    }),
});
