/**
 * yah.mobile チャットサポート — Cloud Functions エントリポイント（codebase: chat）
 *
 * 設計思想: シンプル・モダン・ミニマル・堅牢・安全
 * Cloud Functions: 5関数（トリガー3 ＋ スケジュール2）
 * 外部APIキー: ゼロ / Google サービス依存: 4つのみ (Gemini, Firestore Vector, Gmail, Sheets)
 * 返金・QR 再取得は販売側で完結（chat 非関与）。顧客データは (default) を read-only で直接参照。
 */

import * as admin from "firebase-admin";
admin.initializeApp();

// ── Firestore トリガー (3関数) ──
export { onVisitorMessageCreated } from "./triggers/onVisitorMessageCreated";
export { onSessionEnded } from "./triggers/onSessionEnded";
export { onRagDocumentWritten } from "./triggers/onRagDocumentWritten";

// ── Scheduled 関数 (2関数) ──
export { dataRetentionPurge } from "./scheduled/dataRetention";
export { generateRagDrafts } from "./scheduled/generateRagDrafts";

