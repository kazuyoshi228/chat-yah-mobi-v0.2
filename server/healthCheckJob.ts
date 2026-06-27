/**
 * Health Check Job - 全レイヤー監視Heartbeatハンドラー
 * 5分間隔で実行：Server / Stripe / Resend / OMAX / Database の疎通確認
 * 障害検知時はsystem_healthテーブルに記録し、AIがリアルタイムで状況を把握できるようにする
 */
import { getDb } from "./db";
import { systemHealth } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { ENV } from "./_core/env";

type HealthLayer = "server" | "stripe" | "resend" | "omax" | "database";
type HealthStatus = "ok" | "degraded" | "down" | "unknown";

interface CheckResult {
  status: HealthStatus;
  message: string;
  metadata?: Record<string, any>;
}

// ── Individual health checks ────────────────────────────────────────────────

async function checkDatabase(): Promise<CheckResult> {
  try {
    const db = await getDb();
    if (!db) return { status: "down", message: "DB connection unavailable" };
    // Simple ping query
    await db.execute("SELECT 1" as any);
    return { status: "ok", message: "Database responding normally" };
  } catch (e: any) {
    return { status: "down", message: `Database error: ${e.message}` };
  }
}

async function checkStripe(): Promise<CheckResult> {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { status: "unknown", message: "STRIPE_SECRET_KEY not configured" };

    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) return { status: "ok", message: "Stripe API responding normally" };
    if (res.status === 401) return { status: "degraded", message: "Stripe: invalid API key" };
    return { status: "degraded", message: `Stripe API returned ${res.status}` };
  } catch (e: any) {
    if (e.name === "TimeoutError") return { status: "down", message: "Stripe API timeout" };
    return { status: "down", message: `Stripe unreachable: ${e.message}` };
  }
}

async function checkResend(): Promise<CheckResult> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return { status: "unknown", message: "RESEND_API_KEY not configured" };

    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resendKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) return { status: "ok", message: "Resend API responding normally" };
    if (res.status === 401) return { status: "degraded", message: "Resend: invalid API key" };
    return { status: "degraded", message: `Resend API returned ${res.status}` };
  } catch (e: any) {
    if (e.name === "TimeoutError") return { status: "down", message: "Resend API timeout" };
    return { status: "down", message: `Resend unreachable: ${e.message}` };
  }
}

async function checkOmax(): Promise<CheckResult> {
  try {
    const clientId = ENV.omaxClientId;
    const clientSecret = ENV.omaxClientSecret;
    if (!clientId || !clientSecret) return { status: "unknown", message: "OMAX credentials not configured" };

    // Try to get a token as a health check
    const res = await fetch(
      "https://id.omaxtelecom.com/realms/platform/protocol/openid-connect/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.ok) return { status: "ok", message: "OMAX API responding normally" };
    if (res.status === 401) return { status: "degraded", message: "OMAX: invalid credentials" };
    return { status: "degraded", message: `OMAX API returned ${res.status}` };
  } catch (e: any) {
    if (e.name === "TimeoutError") return { status: "down", message: "OMAX API timeout" };
    return { status: "down", message: `OMAX unreachable: ${e.message}` };
  }
}

// ── Upsert health record ────────────────────────────────────────────────────

async function upsertHealthRecord(
  db: any,
  layer: HealthLayer,
  result: CheckResult
): Promise<void> {
  const existing = await db
    .select()
    .from(systemHealth)
    .where(eq(systemHealth.layer, layer))
    .orderBy(desc(systemHealth.checkedAt))
    .limit(1);

  const now = new Date();

  if (existing.length === 0) {
    // 初回レコード作成
    await db.insert(systemHealth).values({
      layer,
      status: result.status,
      message: result.message,
      errorCount: result.status === "ok" ? 0 : 1,
      checkedAt: now,
      metadata: result.metadata ?? null,
    });
    return;
  }

  const prev = existing[0];
  const wasDown = prev.status !== "ok";
  const isNowOk = result.status === "ok";

  if (isNowOk && wasDown) {
    // 回復：resolvedAtを記録してokに更新
    await db
      .update(systemHealth)
      .set({
        status: "ok",
        message: result.message,
        errorCount: 0,
        checkedAt: now,
        resolvedAt: now,
        metadata: result.metadata ?? null,
      })
      .where(eq(systemHealth.id, prev.id));
    console.log(`[HealthCheck] ${layer} RECOVERED`);
  } else if (!isNowOk) {
    // 障害継続または新規障害
    await db
      .update(systemHealth)
      .set({
        status: result.status,
        message: result.message,
        errorCount: (prev.errorCount ?? 0) + 1,
        checkedAt: now,
        resolvedAt: null,
        metadata: result.metadata ?? null,
      })
      .where(eq(systemHealth.id, prev.id));
    if (!wasDown) {
      console.warn(`[HealthCheck] ${layer} DOWN: ${result.message}`);
    }
  } else {
    // 正常継続：checkedAtだけ更新
    await db
      .update(systemHealth)
      .set({ checkedAt: now, message: result.message })
      .where(eq(systemHealth.id, prev.id));
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function runHealthCheckJob(): Promise<void> {
  console.log("[HealthCheck] Starting health check job...");
  const db = await getDb();
  if (!db) {
    console.error("[HealthCheck] DB unavailable, skipping health check");
    return;
  }

  const checks: Array<{ layer: HealthLayer; fn: () => Promise<CheckResult> }> = [
    { layer: "database", fn: checkDatabase },
    { layer: "stripe", fn: checkStripe },
    { layer: "resend", fn: checkResend },
    { layer: "omax", fn: checkOmax },
    // server layer is always "ok" if this code is running
    {
      layer: "server",
      fn: async () => ({ status: "ok", message: "Server running normally" }),
    },
  ];

  for (const { layer, fn } of checks) {
    try {
      const result = await fn();
      await upsertHealthRecord(db, layer, result);
    } catch (e: any) {
      console.error(`[HealthCheck] ${layer} check threw:`, e.message);
      await upsertHealthRecord(db, layer, {
        status: "down",
        message: `Check failed: ${e.message}`,
      }).catch(() => {});
    }
  }

  console.log("[HealthCheck] Health check job completed");
}
