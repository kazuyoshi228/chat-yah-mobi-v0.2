/**
 * yah.mobile チャットサポート — Cloud Functions エントリポイント
 *
 * 設計思想: シンプル・モダン・ミニマル・堅牢・安全
 * Cloud Functions: 6関数のみ
 * 外部APIキー: ゼロ
 * Google サービス依存: 4つのみ (Gemini, Firestore Vector, Gmail, Sheets)
 */

import * as admin from "firebase-admin";
admin.initializeApp();

// ── Firestore トリガー (3関数) ──
export { onVisitorMessageCreated } from "./triggers/onVisitorMessageCreated";
export { onSessionEnded } from "./triggers/onSessionEnded";
export { onRagDocumentWritten } from "./triggers/onRagDocumentWritten";

// ── Callable 関数 (1関数) ──
export { checkQrResend } from "./callable/qrResend";

// ── HTTPS エンドポイント (1関数 — 移行過渡期のみ) ──
export { webhookSync } from "./webhook/sync";

// ── Scheduled 関数 (1関数) ──
export { dataRetentionPurge } from "./scheduled/dataRetention";

