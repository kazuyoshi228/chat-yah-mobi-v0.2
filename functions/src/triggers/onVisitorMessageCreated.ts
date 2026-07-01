/**
 * onVisitorMessageCreated — メインAI応答トリガー
 *
 * トリガー: /chat_sessions/{sessionId}/messages/{messageId} の作成
 * 処理:
 *   1. ホスピタリティ基準ロード
 *   2. RAG ハイブリッド検索
 *   3. 動的コンテキスト構築（顧客データ）
 *   4. Gemini AI 回答生成（翻訳も兼用）
 *   5. エスカレーション判定（未解決 → Gmail + Sheets）
 */

import {
  onDocumentCreated,
  FirestoreEvent,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import {
  loadHospitalityGuidelines,
  searchRAG,
  generateAIResponse,
  AIResponse,
} from "../utils/ai";
import {
  REGION,
  ADMIN_EMAIL,
  SHEETS_JOURNAL_ID,
  MAX_MESSAGES_PER_SESSION,
} from "../config";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onVisitorMessageCreated = onDocumentCreated(
  {
    document: "chat_sessions/{sessionId}/chat_messages/{messageId}",
    region: REGION,
    // Cloud Functions v2: メモリ・タイムアウト設定
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (
    event: FirestoreEvent<QueryDocumentSnapshot | undefined, {
      sessionId: string;
      messageId: string;
    }>
  ) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const { sessionId } = event.params;

    // ── ガード: visitor のメッセージのみ処理 ──
    if (data.role !== "visitor") return;

    // ── セッション確認: active のみ ──
    const sessionRef = db.doc(`chat_sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists || sessionSnap.data()?.status !== "active") return;

    const session = sessionSnap.data()!;
    const visitorId = session.visitorId as string;
    const visitorLanguage = (session.language as string) || "ja";

    try {
      // ── Step 1: ホスピタリティ基準ロード ──
      const hospitalityPrompt = await loadHospitalityGuidelines();

      // ── Step 2: RAG ハイブリッド検索 ──
      const ragResults = await searchRAG(data.content);
      const ragContext = ragResults.map((r) => r.content).join("\n\n---\n\n");

      // ── Step 3: 動的コンテキスト構築 ──
      const customerContext = await buildCustomerContext(visitorId);

      // ── Step 4: 会話履歴取得 ──
      const historySnap = await db
        .collection(`chat_sessions/${sessionId}/chat_messages`)
        .orderBy("createdAt", "asc")
        .limit(MAX_MESSAGES_PER_SESSION)
        .get();

      const conversationHistory = historySnap.docs.map((doc) => ({
        role: doc.data().role as string,
        content: doc.data().content as string,
      }));

      // ── Step 5: Gemini AI 回答生成 ──
      const aiResponse: AIResponse = await generateAIResponse({
        visitorMessage: data.content,
        visitorLanguage,
        ragContext,
        customerContext,
        hospitalityPrompt,
        conversationHistory,
      });

      // ── Step 6: AI回答をメッセージに追加 ──
      await db.collection(`chat_sessions/${sessionId}/chat_messages`).add({
        role: "ai",
        content: aiResponse.answer,
        resolved: aiResponse.resolved,
        language: aiResponse.language,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Step 7: エスカレーション判定 ──
      if (!aiResponse.resolved) {
        await handleEscalation(
          sessionId,
          visitorId,
          aiResponse,
          sessionRef
        );
      }
    } catch (error) {
      console.error("AI応答生成エラー:", error);

      // エラー時もユーザーにメッセージを返す
      await db.collection(`chat_sessions/${sessionId}/chat_messages`).add({
        role: "ai",
        content:
          "申し訳ございません。一時的なエラーが発生しました。しばらくしてからもう一度お試しください。",
        resolved: false,
        language: "ja",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * 顧客コンテキストを構築
 */
async function buildCustomerContext(visitorId: string): Promise<string> {
  const parts: string[] = [];

  // 顧客プロファイル
  const profileSnap = await db.doc(`customerProfiles/${visitorId}`).get();
  if (profileSnap.exists) {
    const p = profileSnap.data()!;
    parts.push(`顧客名: ${p.name || "不明"}`);
    parts.push(`メール: ${p.email || "不明"}`);
  } else {
    parts.push("顧客: 匿名ユーザー");
  }

  // 購入履歴
  const purchasesSnap = await db
    .collection("purchases")
    .where("uid", "==", visitorId)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  if (!purchasesSnap.empty) {
    const purchases = purchasesSnap.docs.map((doc) => {
      const d = doc.data();
      return `- ${d.planName || "不明プラン"} (${d.status || "不明"})`;
    });
    parts.push(`\n購入履歴:\n${purchases.join("\n")}`);
  }

  // eSIM状態
  const esimSnap = await db
    .collection("esimStatuses")
    .where("uid", "==", visitorId)
    .limit(5)
    .get();

  if (!esimSnap.empty) {
    const statuses = esimSnap.docs.map((doc) => {
      const d = doc.data();
      return `- ICCID: ${d.iccid || "不明"} / 状態: ${d.status || "不明"}`;
    });
    parts.push(`\neSIM状態:\n${statuses.join("\n")}`);
  }

  return parts.join("\n");
}

/**
 * エスカレーション処理: Gmail通知 + Google Sheets 記録
 */
async function handleEscalation(
  sessionId: string,
  visitorId: string,
  aiResponse: AIResponse,
  sessionRef: admin.firestore.DocumentReference
): Promise<void> {
  // セッションにフラグ設定
  await sessionRef.update({ escalated: true });

  // 顧客名取得
  const profileSnap = await db.doc(`customerProfiles/${visitorId}`).get();
  const customerName = profileSnap.exists
    ? (profileSnap.data()?.name as string) || "匿名"
    : "匿名";

  // ── Gmail API: Admin にエスカレーション通知 ──
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
    });
    const gmail = google.gmail({ version: "v1", auth });

    const subject = `[yah.mobi チャット] エスカレーション: ${customerName}`;
    const body = [
      `セッションID: ${sessionId}`,
      `顧客: ${customerName}`,
      `理由: ${aiResponse.escalationReason}`,
      `AI回答: ${aiResponse.answer.substring(0, 200)}...`,
      "",
      `管理画面: https://chat.yah.mobi/admin/sessions/${sessionId}`,
    ].join("\n");

    const raw = Buffer.from(
      `To: ${ADMIN_EMAIL}\r\n` +
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=\r\n` +
        `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
        body
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });
  } catch (error) {
    console.error("エスカレーションメール送信エラー:", error);
  }

  // ── Google Sheets API: 仕訳帳に記録 ──
  if (SHEETS_JOURNAL_ID) {
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets = google.sheets({ version: "v4", auth });

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEETS_JOURNAL_ID,
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
    } catch (error) {
      console.error("Sheets 記録エラー:", error);
    }
  }
}
