"use strict";
/**
 * dataRetentionPurge — データ保持期限に基づく自動削除
 *
 * スケジュール: 毎日 03:00 JST（UTC 18:00）
 * 処理:
 *   1. scheduledDeleteAt <= 現在時刻 のセッションを検索
 *   2. セッション配下の messages サブコレクションを一括削除
 *   3. 関連する chat_surveys ドキュメントを削除
 *   4. セッション本体を削除
 *   5. バッチ処理で効率的に削除
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
exports.dataRetentionPurge = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
/** バッチ削除の上限（Firestore の制限: 500） */
const BATCH_SIZE = 450;
exports.dataRetentionPurge = (0, scheduler_1.onSchedule)({
    schedule: "0 18 * * *", // UTC 18:00 = JST 03:00
    timeZone: "UTC",
    region: config_1.REGION,
    timeoutSeconds: 540, // 最大 9分
    memory: "512MiB",
}, async () => {
    const now = admin.firestore.Timestamp.now();
    let totalDeleted = 0;
    try {
        // ── 期限切れセッションを検索 ──
        const expiredSnap = await db
            .collection("chat_sessions")
            .where("scheduledDeleteAt", "<=", now)
            .limit(100) // 1回の実行で最大100セッション処理
            .get();
        if (expiredSnap.empty) {
            console.log("データ保持: 期限切れセッションなし");
            return;
        }
        console.log(`データ保持: ${expiredSnap.size} 件の期限切れセッションを検出`);
        // ── セッションごとに削除処理 ──
        for (const sessionDoc of expiredSnap.docs) {
            const sessionId = sessionDoc.id;
            try {
                // 1. messages サブコレクションを一括削除
                await deleteSubcollection(`chat_sessions/${sessionId}/chat_messages`);
                // 2. 関連する chat_surveys ドキュメントを削除
                await deleteSurveys(sessionId);
                // 3. セッション本体を削除
                await sessionDoc.ref.delete();
                totalDeleted++;
                console.log(`セッション削除完了: ${sessionId}`);
            }
            catch (error) {
                console.error(`セッション削除エラー (${sessionId}):`, error);
                // 個別エラーは無視して次のセッションへ
            }
        }
        console.log(`データ保持: 合計 ${totalDeleted} セッションを削除`);
    }
    catch (error) {
        console.error("データ保持ジョブエラー:", error);
    }
});
/**
 * サブコレクション内のドキュメントをバッチ削除
 */
async function deleteSubcollection(collectionPath) {
    const collRef = db.collection(collectionPath);
    // ページネーションで全件削除
    let query = collRef.limit(BATCH_SIZE);
    let snapshot = await query.get();
    while (!snapshot.empty) {
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        // 次のバッチを取得
        snapshot = await query.get();
    }
}
/**
 * セッションに関連する chat_surveys ドキュメントを削除
 */
async function deleteSurveys(sessionId) {
    const chat_surveysSnap = await db
        .collection("chat_surveys")
        .where("sessionId", "==", sessionId)
        .get();
    if (chat_surveysSnap.empty)
        return;
    const batch = db.batch();
    for (const doc of chat_surveysSnap.docs) {
        batch.delete(doc.ref);
    }
    await batch.commit();
}
//# sourceMappingURL=dataRetention.js.map