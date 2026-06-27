/**
 * System Health Router
 * - POST /api/errors/report  : フロントエンドエラー収集
 * - GET  /api/health/status  : 全レイヤーの最新ステータス取得（管理画面用）
 */
import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { systemHealth } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const systemHealthRouter = Router();

// ── POST /api/errors/report ─────────────────────────────────────────────────
// yah.mobi/app や chat.yah.mobi フロントエンドからエラーを受信して記録
systemHealthRouter.post("/errors/report", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ ok: false }); return; }

    const { layer = "frontend", message, metadata } = req.body ?? {};

    // 同じlayerの最新レコードを取得
    const existing = await db
      .select()
      .from(systemHealth)
      .where(eq(systemHealth.layer, layer))
      .orderBy(desc(systemHealth.checkedAt))
      .limit(1);

    if (existing.length > 0 && existing[0].status !== "ok") {
      // 既存の障害レコードのerrorCountをインクリメント
      await db
        .update(systemHealth)
        .set({
          errorCount: (existing[0].errorCount ?? 0) + 1,
          message: message ?? existing[0].message,
          metadata: metadata ?? existing[0].metadata,
          checkedAt: new Date(),
        })
        .where(eq(systemHealth.id, existing[0].id));
    } else {
      // 新規障害レコードを作成
      await db.insert(systemHealth).values({
        layer: layer as any,
        status: "degraded",
        message: message ?? "Frontend error reported",
        errorCount: 1,
        checkedAt: new Date(),
        metadata: metadata ?? null,
      });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[SystemHealth] error report failed:", e);
    res.status(500).json({ ok: false });
  }
});

// ── GET /api/health/status ──────────────────────────────────────────────────
// 各レイヤーの最新ステータスを返す（管理画面・AI context用）
systemHealthRouter.get("/health/status", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }

    const layers = ["frontend", "server", "stripe", "resend", "omax", "database"] as const;
    const result: Record<string, any> = {};

    for (const layer of layers) {
      const rows = await db
        .select()
        .from(systemHealth)
        .where(eq(systemHealth.layer, layer))
        .orderBy(desc(systemHealth.checkedAt))
        .limit(1);

      result[layer] = rows[0] ?? { layer, status: "unknown", message: null, errorCount: 0, checkedAt: null };
    }

    res.json({ ok: true, layers: result });
  } catch (e) {
    console.error("[SystemHealth] status fetch failed:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { systemHealthRouter };
