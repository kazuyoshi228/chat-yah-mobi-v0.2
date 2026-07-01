"use strict";
/**
 * onSessionEnded — セッション終了時のサマリー生成 + ジャーナル記録
 *
 * トリガー: /chatSessions/{sessionId} の更新
 * ガード: status が 'ended' に変更された場合のみ処理
 * 処理:
 *   1. サブコレクションから全メッセージ取得
 *   2. Gemini でサマリー生成
 *   3. セッションに summary + scheduledDeleteAt を書き込み
 *   4. Google Sheets 仕訳帳に最終結果を記録
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
exports.onSessionEnded = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const ai_1 = require("../utils/ai");
const config_1 = require("../config");
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onSessionEnded = (0, firestore_1.onDocumentUpdated)({
    document: "chatSessions/{sessionId}",
    region: config_1.REGION,
}, async (event) => {
    if (!event.data)
        return;
    const before = event.data.before.data();
    const after = event.data.after.data();
    const { sessionId } = event.params;
    // ── ガード: status が 'ended' に変更された場合のみ ──
    if (before.status === "ended" || after.status !== "ended")
        return;
    try {
        // ── Step 1: 全メッセージ取得 ──
        const messagesSnap = await db
            .collection(`chatSessions/${sessionId}/messages`)
            .orderBy("createdAt", "asc")
            .get();
        const messages = messagesSnap.docs.map((doc) => ({
            role: doc.data().role,
            content: doc.data().content,
        }));
        // ── Step 2: Gemini でサマリー生成 ──
        const summary = messages.length > 0
            ? await (0, ai_1.generateSummary)(messages)
            : "メッセージなし";
        // ── Step 3: セッション更新（summary + scheduledDeleteAt） ──
        const createdAt = after.createdAt;
        const scheduledDeleteAt = new Date(createdAt.toDate().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
        const sessionRef = db.doc(`chatSessions/${sessionId}`);
        await sessionRef.update({
            summary,
            scheduledDeleteAt: admin.firestore.Timestamp.fromDate(scheduledDeleteAt),
        });
        // ── Step 4: Google Sheets 仕訳帳に最終結果を記録 ──
        const resolved = after.escalated !== true;
        await writeToJournal(sessionId, after, summary, resolved);
    }
    catch (error) {
        console.error("セッション終了処理エラー:", error);
    }
});
/**
 * Google Sheets 仕訳帳にセッション結果を記録
 */
async function writeToJournal(sessionId, sessionData, summary, resolved) {
    if (!config_1.SHEETS_JOURNAL_ID)
        return;
    try {
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = googleapis_1.google.sheets({ version: "v4", auth });
        const visitorId = sessionData.visitorId || "不明";
        const language = sessionData.language || "ja";
        await sheets.spreadsheets.values.append({
            spreadsheetId: config_1.SHEETS_JOURNAL_ID,
            range: "セッション結果!A:G",
            valueInputOption: "USER_ENTERED",
            requestBody: {
                values: [
                    [
                        new Date().toISOString(),
                        sessionId,
                        visitorId,
                        language,
                        resolved ? "✅ 解決" : "❌ 未解決",
                        summary.substring(0, 300),
                        sessionData.escalated ? "エスカレーション済" : "",
                    ],
                ],
            },
        });
    }
    catch (error) {
        console.error("Sheets 仕訳帳記録エラー:", error);
    }
}
//# sourceMappingURL=onSessionEnded.js.map