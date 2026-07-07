"use strict";
/**
 * onVisitorMessageCreated — メインAI応答トリガー（chat DB）
 *
 * トリガー: [chat DB] /chat_sessions/{sessionId}/chat_messages/{messageId} の作成
 * 処理:
 *   1. ホスピタリティ基準ロード（chat DB）
 *   2. RAG ハイブリッド検索（chat DB）
 *   3. 動的コンテキスト構築（顧客データ = 販売 (default) DB を read-only 参照）
 *   4. Gemini AI 回答生成（翻訳も兼用）
 *   5. エスカレーション判定（未解決 → Gmail + Sheets）
 *
 * 🚨 (default) DB は read-only。書き込みは chatDb のみ。
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
exports.onVisitorMessageCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const googleapis_1 = require("googleapis");
const db_1 = require("../db");
const ai_1 = require("../utils/ai");
const mail_1 = require("../utils/mail");
const config_1 = require("../config");
exports.onVisitorMessageCreated = (0, firestore_1.onDocumentCreated)({
    document: "chat_sessions/{sessionId}/chat_messages/{messageId}",
    database: db_1.CHAT_DATABASE_ID,
    region: config_1.REGION,
    // Cloud Functions v2: メモリ・タイムアウト設定
    memory: "512MiB",
    timeoutSeconds: 120,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const { sessionId, messageId } = event.params;
    // ── ガード: visitor のメッセージのみ処理 ──
    if (data.role !== "visitor")
        return;
    // ── セッション確認: active のみ ──
    const sessionRef = db_1.chatDb.doc(`chat_sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists || sessionSnap.data()?.status !== "active")
        return;
    const session = sessionSnap.data();
    const visitorId = session.visitorId;
    const visitorLanguage = session.language || "ja";
    try {
        // ── Step 0: コスト保護（訪問者ごとの日次レート制限・Firestore カウンタ） ──
        const withinLimit = await checkDailyRateLimit(visitorId);
        if (!withinLimit) {
            console.warn(`レート制限超過: visitor=${visitorId}`);
            await db_1.chatDb
                .collection(`chat_sessions/${sessionId}/chat_messages`)
                .add({
                role: "ai",
                content: "本日のご利用上限に達しました。お手数ですが、明日以降に再度お試しください。",
                resolved: false,
                language: visitorLanguage,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        // ── Step 1: ホスピタリティ基準ロード（状況別トリガーに訪問者メッセージを渡す） ──
        const hospitalityPrompt = await (0, ai_1.loadHospitalityGuidelines)(data.content);
        // ── Step 2: RAG ハイブリッド検索 ──
        const ragResults = await (0, ai_1.searchRAG)(data.content);
        const ragContext = ragResults.map((r) => r.content).join("\n\n---\n\n");
        // ── Step 3: 動的コンテキスト構築（(default) read-only） ──
        const customerContext = await buildCustomerContext(visitorId);
        // ── Step 4: 会話履歴取得 ──
        const historySnap = await db_1.chatDb
            .collection(`chat_sessions/${sessionId}/chat_messages`)
            .orderBy("createdAt", "asc")
            .limit(config_1.MAX_MESSAGES_PER_SESSION)
            .get();
        const conversationHistory = historySnap.docs.map((doc) => ({
            role: doc.data().role,
            content: doc.data().content,
        }));
        // ── Step 5: Gemini AI 回答生成 ──
        const aiResponse = await (0, ai_1.generateAIResponse)({
            visitorMessage: data.content,
            visitorLanguage,
            ragContext,
            customerContext,
            hospitalityPrompt,
            conversationHistory,
        });
        // ── Step 6: AI回答をメッセージに追加 ──
        await db_1.chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
            role: "ai",
            content: aiResponse.answer,
            resolved: aiResponse.resolved,
            language: aiResponse.language,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // ── Step 6.5: 監査ログ（失敗分析用・chat_agent_logs） ──
        //   解決率・原因別クラスタ・会話/原因RAGリンクの元データ。
        //   ログ失敗が本体フローを止めないよう独立 try/catch。
        try {
            const ragHitCount = ragResults.length;
            await db_1.chatDb.collection("chat_agent_logs").add({
                sessionId,
                messageId,
                visitorId,
                language: aiResponse.language,
                question: data.content.slice(0, 1000),
                answer: aiResponse.answer.slice(0, 1000),
                resolved: aiResponse.resolved,
                ragHitCount,
                ragTopId: ragResults[0]?.id ?? null,
                ragTopScore: ragResults[0]?.score ?? null,
                failureBucket: classifyFailure(aiResponse.resolved, ragHitCount, data.content, aiResponse.escalationReason),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        catch (logErr) {
            console.error("chat_agent_logs 記録エラー:", logErr);
        }
        // ── Step 7: エスカレーション判定 ──
        if (!aiResponse.resolved) {
            await handleEscalation(sessionId, visitorId, aiResponse, sessionRef);
        }
    }
    catch (error) {
        console.error("AI応答生成エラー:", error);
        // エラー時もユーザーにメッセージを返す
        await db_1.chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
            role: "ai",
            content: "申し訳ございません。一時的なエラーが発生しました。しばらくしてからもう一度お試しください。",
            resolved: false,
            language: "ja",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
/**
 * 失敗の原因分類（ルールベース・追加API無し）
 * - resolved            : 解決（失敗ではない）
 * - knowledge_gap       : RAGヒット0（該当知識なし＝L1自動ドラフトの対象）
 * - account_or_emotional: 注文/eSIM/返金/怒り/人間希望 等（AI単独では不可の領域）
 * - answer_quality      : 上記以外の未解決（文書はあるが解決に至らず）
 */
function classifyFailure(resolved, ragHitCount, question, escalationReason) {
    if (resolved)
        return "resolved";
    if (ragHitCount === 0)
        return "knowledge_gap";
    const t = `${question} ${escalationReason}`.toLowerCase();
    const ACCOUNT_OR_EMOTIONAL = [
        // アカウント個別（AIでは実行不可）
        "注文", "order", "返金", "払い戻", "refund", "退款", "환불", "hoàn tiền",
        "esim", "iccid", "残量", "データ量", "使い切", "有効期限", "expire",
        // 感情/人間希望
        "最悪", "怒", "ふざけ", "詐欺", "terrible", "worst", "angry", "scam",
        "担当", "オペレーター", "人間", "human", "operator", "agent",
    ];
    if (ACCOUNT_OR_EMOTIONAL.some((k) => t.includes(k))) {
        return "account_or_emotional";
    }
    return "answer_quality";
}
/**
 * 日次レート制限 — chat DB の chat_rate_limits/{visitorId_yyyymmdd} をトランザクションで加算
 * （client からは default deny で触れない。Fn のみが書く）
 */
async function checkDailyRateLimit(visitorId) {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const ref = db_1.chatDb.doc(`chat_rate_limits/${visitorId}_${dateKey}`);
    return db_1.chatDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = (snap.exists ? snap.data()?.count : 0) || 0;
        if (count >= config_1.DAILY_AI_LIMIT_PER_VISITOR)
            return false;
        tx.set(ref, {
            count: count + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return true;
    });
}
/**
 * 顧客コンテキストを構築 — 販売 (default) DB を read-only で直接参照
 *
 * - 本人特定: visitorId = Firebase Auth uid（匿名 uid は何もヒットせず自動的に RAG のみ）
 * - 参照: users/{uid} / orders(userId==uid) / esim_links(userId==uid)
 * - 🚨 機微情報（決済ID・メール等）は AI コンテキストに載せない
 * - (default) に複合インデックスを要求しないよう orderBy は使わず、メモリ内でソート
 * - TODO(要確認): orders / esim_links の表示用フィールド実キー（planName/status/期限/データ量）
 *   は yah.mobi 実データで確認して調整する
 */
async function buildCustomerContext(visitorId) {
    const parts = [];
    // 顧客プロファイル（(default)/users/{uid}）
    const userSnap = await db_1.defaultDb.doc(`users/${visitorId}`).get();
    const uname = userSnap.exists
        ? (userSnap.data()?.displayName ||
            userSnap.data()?.name ||
            "")
        : "";
    if (uname) {
        parts.push(`顧客名: ${uname}`);
    }
    else {
        // 名前不明（匿名等）: AI が『匿名ユーザー様』と呼ばないよう明示
        parts.push("顧客名: 不明（名前が分からないため『お客様』とお呼びする）");
    }
    // 購入状況（(default)/orders where userId == uid）
    const ordersSnap = await db_1.defaultDb
        .collection("orders")
        .where("userId", "==", visitorId)
        .limit(10)
        .get();
    if (!ordersSnap.empty) {
        // createdAt は number(ms) / Firestore Timestamp のどちらでも扱えるように
        const toMillis = (v) => typeof v === "number"
            ? v
            : v instanceof admin.firestore.Timestamp
                ? v.toMillis()
                : 0;
        const orders = ordersSnap.docs
            .map((doc) => doc.data())
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
            .slice(0, 5)
            .map((d) => {
            const plan = d.planName || d.planId || "不明プラン";
            return `- ${plan} (${d.status || "不明"})`;
        });
        parts.push(`\n購入履歴:\n${orders.join("\n")}`);
    }
    // eSIM状態（(default)/esim_links where userId == uid）
    const esimSnap = await db_1.defaultDb
        .collection("esim_links")
        .where("userId", "==", visitorId)
        .limit(5)
        .get();
    if (!esimSnap.empty) {
        const statuses = esimSnap.docs.map((doc) => {
            const d = doc.data();
            // ICCID は機微なため下4桁のみ（本人確認の言及用・全桁は載せない）
            const iccid = d.iccid ? `****${String(d.iccid).slice(-4)}` : "不明";
            return `- ICCID: ${iccid} / 状態: ${d.status || "不明"}`;
        });
        parts.push(`\neSIM状態:\n${statuses.join("\n")}`);
    }
    return parts.join("\n");
}
/**
 * エスカレーション処理: Gmail通知 + Google Sheets 記録
 */
async function handleEscalation(sessionId, visitorId, aiResponse, sessionRef) {
    // セッションにフラグ設定（chat DB）
    await sessionRef.update({ escalated: true });
    // 顧客名取得（(default)/users read-only）
    const userSnap = await db_1.defaultDb.doc(`users/${visitorId}`).get();
    const customerName = userSnap.exists
        ? userSnap.data()?.displayName ||
            userSnap.data()?.name ||
            "匿名"
        : "匿名";
    // ── Gmail: Admin にエスカレーション通知（共通 sendGmail を使用） ──
    await (0, mail_1.sendGmail)({
        to: config_1.ADMIN_EMAIL,
        subject: `[yah.mobi チャット] エスカレーション: ${customerName}`,
        body: [
            `セッションID: ${sessionId}`,
            `顧客: ${customerName}`,
            `理由: ${aiResponse.escalationReason}`,
            `AI回答: ${aiResponse.answer.substring(0, 200)}...`,
            "",
            `管理画面: ${config_1.ADMIN_BASE_URL}/admin/chats?session=${sessionId}`,
        ].join("\n"),
    });
    // ── Google Sheets API: 仕訳帳に記録 ──
    if (config_1.SHEETS_JOURNAL_ID) {
        try {
            const auth = new googleapis_1.google.auth.GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });
            const sheets = googleapis_1.google.sheets({ version: "v4", auth });
            await sheets.spreadsheets.values.append({
                spreadsheetId: config_1.SHEETS_JOURNAL_ID,
                range: "エスカレーション!A:F",
                valueInputOption: "USER_ENTERED",
                requestBody: {
                    values: [
                        [
                            new Date().toISOString(),
                            sessionId,
                            customerName,
                            "❌",
                            aiResponse.escalationReason,
                            aiResponse.answer.substring(0, 200),
                        ],
                    ],
                },
            });
        }
        catch (error) {
            console.error("Sheets 記録エラー:", error);
        }
    }
}
//# sourceMappingURL=onVisitorMessageCreated.js.map