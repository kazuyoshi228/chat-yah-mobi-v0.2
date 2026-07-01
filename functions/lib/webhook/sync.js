"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookSync = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
if (!admin.apps.length)
    admin.initializeApp();
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
exports.webhookSync = (0, https_1.onRequest)({
    region: config_1.REGION,
    cors: false,
}, async (req, res) => {
    // ── メソッドチェック: POST のみ ──
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    // ── 認証: X-Webhook-Secret ヘッダー検証 ──
    const secret = req.headers["x-webhook-secret"];
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
        console.warn("Webhook 認証失敗: 不正なシークレット");
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    // ── リクエストボディ解析 ──
    const body = req.body;
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
        await docRef.set({
            ...data,
            _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            _syncSource: "webhook",
        }, { merge: true });
        console.log(`Webhook 同期完了: ${collection}/${documentId}`);
        res.status(200).json({
            success: true,
            path: `${collection}/${documentId}`,
        });
    }
    catch (error) {
        console.error("Webhook 書き込みエラー:", error);
        res.status(500).json({ error: "書き込みに失敗しました。" });
    }
});
//# sourceMappingURL=sync.js.map