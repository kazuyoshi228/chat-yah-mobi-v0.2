/**
 * webhookSync — 外部システム連携用 HTTPS Webhook
 *
 * 移行過渡期に外部システム（Stripe, eSIMプロバイダ等）から
 * Firestore にデータを同期するためのエンドポイント。
 *
 * セキュリティ:
 *   - X-Webhook-Secret ヘッダーで共有シークレット認証
 *   - 書き込み可能コレクションをホワイトリストで制限
 *
 * メソッド: POST のみ
 * ボディ: { collection, documentId, data }
 */

import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { REGION } from "../config";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** 書き込み許可コレクション（ホワイトリスト） */
const ALLOWED_COLLECTIONS = new Set([
  "customerProfiles",
  "purchases",
  "esimStatuses",
  "esimIncidents",
  "plans",
  "competitorPlans",
]);

/** Webhook 共有シークレット（環境変数から取得） */
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/** リクエストボディの型定義 */
interface WebhookSyncBody {
  collection?: string;
  documentId?: string;
  data?: Record<string, unknown>;
}

export const webhookSync = onRequest(
  {
    region: REGION,
    cors: false,
  },
  async (req, res) => {
    // ── メソッドチェック: POST のみ ──
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    // ── 認証: X-Webhook-Secret ヘッダー検証 ──
    const secret = req.headers["x-webhook-secret"] as string | undefined;
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      console.warn("Webhook 認証失敗: 不正なシークレット");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // ── リクエストボディ解析 ──
    const body = req.body as WebhookSyncBody;
    const { collection, documentId, data } = body;

    // ── バリデーション: 必須パラメータ ──
    if (!collection || typeof collection !== "string") {
      res.status(400).json({ error: "collection は必須です。" });
      return;
    }
    if (!documentId || typeof documentId !== "string") {
      res.status(400).json({ error: "documentId は必須です。" });
      return;
    }
    if (!data || typeof data !== "object") {
      res.status(400).json({ error: "data は必須です。" });
      return;
    }

    // ── コレクション制限: ホワイトリスト検証 ──
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      console.warn(`Webhook 拒否: 許可されていないコレクション "${collection}"`);
      res.status(400).json({
        error: `許可されていないコレクションです: ${collection}`,
        allowedCollections: Array.from(ALLOWED_COLLECTIONS),
      });
      return;
    }

    // ── Firestore に書き込み（merge で既存データ保持） ──
    try {
      const docRef = db.doc(`${collection}/${documentId}`);
      await docRef.set(
        {
          ...data,
          _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          _syncSource: "webhook",
        },
        { merge: true }
      );

      console.log(`Webhook 同期完了: ${collection}/${documentId}`);

      res.status(200).json({
        success: true,
        path: `${collection}/${documentId}`,
      });
    } catch (error) {
      console.error("Webhook 書き込みエラー:", error);
      res.status(500).json({ error: "書き込みに失敗しました。" });
    }
  }
);
