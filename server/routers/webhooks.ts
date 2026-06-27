/**
 * Webhook endpoints for yah.mobi/app integration
 * Receives: plans, competitor_plans, customer_profiles, purchases, esim_statuses
 * Auth: X-Webhook-Secret header must match WEBHOOK_SECRET env var
 */
import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import {
  plans,
  competitorPlans,
  customerProfiles,
  purchases,
  esimStatuses,
} from "../../drizzle/schema";



const webhookRouter = Router();

// ── Auth middleware ──────────────────────────────────────────────────────────
function verifyWebhookSecret(req: Request, res: Response): boolean {
  const secret = req.headers["x-webhook-secret"];
  const expected = ENV.webhookSecret;
  if (!expected) {
    console.warn("[Webhook] WEBHOOK_SECRET not set — rejecting all requests");
    res.status(500).json({ error: "Webhook secret not configured" });
    return false;
  }
  if (!secret || secret !== expected) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return false;
  }
  return true;
}

// ── POST /api/webhooks/plans-updated ────────────────────────────────────────
webhookRouter.post("/plans-updated", async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req, res)) return;
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
    // Support both {plans: [...]} and direct array
    const rawItems = req.body?.plans ?? req.body;
    const items: Array<{
      externalId: string;
      name: string;
      dataGb: number;
      durationDays: number;
      priceYen: number;
      bestFor?: string;
      isActive?: number;
      sortOrder?: number;
    }> = Array.isArray(rawItems) ? rawItems : [rawItems];

    for (const item of items) {
      await db
        .insert(plans)
        .values({
          externalId: item.externalId,
          name: item.name,
          dataGb: item.dataGb,
          durationDays: item.durationDays,
          priceYen: item.priceYen,
          bestFor: item.bestFor ?? null,
          isActive: item.isActive ?? 1,
          sortOrder: item.sortOrder ?? 0,
          syncedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            name: item.name,
            dataGb: item.dataGb,
            durationDays: item.durationDays,
            priceYen: item.priceYen,
            bestFor: item.bestFor ?? null,
            isActive: item.isActive ?? 1,
            sortOrder: item.sortOrder ?? 0,
            syncedAt: new Date(),
          },
        });
    }
    res.json({ ok: true, synced: items.length });
  } catch (e) {
    console.error("[Webhook] plans-updated error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/webhooks/competitor-plans-updated ──────────────────────────────
webhookRouter.post("/competitor-plans-updated", async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req, res)) return;
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
    // Support both {plans: [...]} and direct array
    const rawItems = req.body?.plans ?? req.body;
    const items: Array<{
      externalId: string;
      competitorName: string;
      planName: string;
      dataGb: number;
      durationDays: number;
      priceYen: number;
      sourceUrl?: string;
    }> = Array.isArray(rawItems) ? rawItems : [rawItems];

    for (const item of items) {
      await db
        .insert(competitorPlans)
        .values({
          externalId: item.externalId,
          competitorName: item.competitorName,
          planName: item.planName,
          dataGb: item.dataGb,
          durationDays: item.durationDays,
          priceYen: item.priceYen,
          sourceUrl: item.sourceUrl ?? null,
          syncedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            competitorName: item.competitorName,
            planName: item.planName,
            dataGb: item.dataGb,
            durationDays: item.durationDays,
            priceYen: item.priceYen,
            sourceUrl: item.sourceUrl ?? null,
            syncedAt: new Date(),
          },
        });
    }
    res.json({ ok: true, synced: items.length });
  } catch (e) {
    console.error("[Webhook] competitor-plans-updated error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/webhooks/customer-profile ─────────────────────────────────────
webhookRouter.post("/customer-profile", async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req, res)) return;
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
    const item: {
      externalUserId: string;
      email?: string;
      name?: string;
      language?: string;
      registeredAt?: string;
    } = req.body;

    await db
      .insert(customerProfiles)
      .values({
        externalUserId: item.externalUserId,
        email: item.email ?? null,
        name: item.name ?? null,
        language: item.language ?? "ja",
        registeredAt: item.registeredAt ? new Date(item.registeredAt) : null,
        syncedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          email: item.email ?? null,
          name: item.name ?? null,
          language: item.language ?? "ja",
          registeredAt: item.registeredAt ? new Date(item.registeredAt) : null,
          syncedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (e) {
    console.error("[Webhook] customer-profile error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/webhooks/purchase-created ─────────────────────────────────────
webhookRouter.post("/purchase-created", async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req, res)) return;
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
    const item: {
      externalOrderId: string;
      externalUserId: string;
      planName: string;
      dataGb?: number;
      durationDays?: number;
      priceYen: number;
      purchasedAt: string;
      expiresAt?: string;
      status?: "pending" | "active" | "expired" | "refunded" | "cancelled";
    } = req.body;

    await db
      .insert(purchases)
      .values({
        externalOrderId: item.externalOrderId,
        externalUserId: item.externalUserId,
        planName: item.planName,
        dataGb: item.dataGb ?? null,
        durationDays: item.durationDays ?? null,
        priceYen: item.priceYen,
        purchasedAt: new Date(item.purchasedAt),
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        status: item.status ?? "pending",
        syncedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          planName: item.planName,
          dataGb: item.dataGb ?? null,
          durationDays: item.durationDays ?? null,
          priceYen: item.priceYen,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          status: item.status ?? "pending",
          syncedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (e) {
    console.error("[Webhook] purchase-created error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/webhooks/esim-status ──────────────────────────────────────────
webhookRouter.post("/esim-status", async (req: Request, res: Response) => {
  if (!verifyWebhookSecret(req, res)) return;
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
    const item: {
      externalUserId: string;
      externalOrderId: string;
      iccid?: string;
      status: "not_installed" | "installed" | "active" | "expired" | "error";
      activatedAt?: string;
      expiresAt?: string;
      dataUsedMb?: number;
      dataTotalMb?: number;
    } = req.body;

    await db
      .insert(esimStatuses)
      .values({
        externalUserId: item.externalUserId,
        externalOrderId: item.externalOrderId,
        iccid: item.iccid ?? null,
        status: item.status,
        activatedAt: item.activatedAt ? new Date(item.activatedAt) : null,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        dataUsedMb: item.dataUsedMb ?? 0,
        dataTotalMb: item.dataTotalMb ?? null,
        syncedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          iccid: item.iccid ?? null,
          status: item.status,
          activatedAt: item.activatedAt ? new Date(item.activatedAt) : null,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          dataUsedMb: item.dataUsedMb ?? 0,
          dataTotalMb: item.dataTotalMb ?? null,
          syncedAt: new Date(),
        },
      });
    res.json({ ok: true });
  } catch (e) {
    console.error("[Webhook] esim-status error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/webhooks/health ─────────────────────────────────────────────────
webhookRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, message: "Webhook endpoints are active" });
});

export { webhookRouter };
