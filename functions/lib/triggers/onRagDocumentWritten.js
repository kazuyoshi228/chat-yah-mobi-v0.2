"use strict";
/**
 * onRagDocumentWritten — RAGドキュメントの Embedding 自動生成
 *
 * トリガー: /chat_rag_documents/{id} の作成・更新・削除
 * 処理:
 *   - 作成/更新時: content から Gemini Embedding を生成し embedding フィールドに保存
 *   - 削除時: スキップ
 *   - content 未変更時: スキップ（不要な再計算防止）
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
exports.onRagDocumentWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db_1 = require("../db");
const ai_1 = require("../utils/ai");
const config_1 = require("../config");
exports.onRagDocumentWritten = (0, firestore_1.onDocumentWritten)({
    document: "chat_rag_documents/{id}",
    database: db_1.CHAT_DATABASE_ID,
    region: config_1.REGION,
}, async (event) => {
    if (!event.data)
        return;
    const { id } = event.params;
    const afterSnap = event.data.after;
    const beforeSnap = event.data.before;
    // ── ガード: 削除時はスキップ ──
    if (!afterSnap.exists) {
        console.log(`RAGドキュメント削除: ${id} — Embedding 更新不要`);
        return;
    }
    const afterData = afterSnap.data();
    const afterContent = afterData.content;
    // ── ガード: content が空の場合はスキップ ──
    if (!afterContent) {
        console.warn(`RAGドキュメント ${id}: content が空のため Embedding 生成をスキップ`);
        return;
    }
    // ── ガード: content 未変更の場合はスキップ（更新時のみ） ──
    if (beforeSnap.exists) {
        const beforeData = beforeSnap.data();
        const beforeContent = beforeData.content;
        if (beforeContent === afterContent) {
            console.log(`RAGドキュメント ${id}: content 未変更 — Embedding 再生成不要`);
            return;
        }
    }
    try {
        // ── Embedding 生成 ──
        const embedding = await (0, ai_1.generateEmbedding)(afterContent);
        // ── Firestore に Embedding を保存 ──
        await db_1.chatDb.doc(`chat_rag_documents/${id}`).update({
            embedding: admin.firestore.FieldValue.vector(embedding),
            embeddingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`RAGドキュメント ${id}: Embedding 生成完了`);
    }
    catch (error) {
        console.error(`RAGドキュメント ${id}: Embedding 生成エラー:`, error);
    }
});
//# sourceMappingURL=onRagDocumentWritten.js.map