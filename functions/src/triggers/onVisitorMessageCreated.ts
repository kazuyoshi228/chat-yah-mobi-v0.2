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

import {
  onDocumentCreated,
  FirestoreEvent,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { chatDb, defaultDb, CHAT_DATABASE_ID } from "../db";
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
  DAILY_AI_LIMIT_PER_VISITOR,
} from "../config";

export const onVisitorMessageCreated = onDocumentCreated(
  {
    document: "chat_sessions/{sessionId}/chat_messages/{messageId}",
    database: CHAT_DATABASE_ID,
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
    const sessionRef = chatDb.doc(`chat_sessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists || sessionSnap.data()?.status !== "active") return;

    const session = sessionSnap.data()!;
    const visitorId = session.visitorId as string;
    const visitorLanguage = (session.language as string) || "ja";

    try {
      // ── Step 0: コスト保護（訪問者ごとの日次レート制限・Firestore カウンタ） ──
      const withinLimit = await checkDailyRateLimit(visitorId);
      if (!withinLimit) {
        console.warn(`レート制限超過: visitor=${visitorId}`);
        await chatDb
          .collection(`chat_sessions/${sessionId}/chat_messages`)
          .add({
            role: "ai",
            content:
              "本日のご利用上限に達しました。お手数ですが、明日以降に再度お試しください。",
            resolved: false,
            language: visitorLanguage,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        return;
      }

      // ── Step 1: ホスピタリティ基準ロード（状況別トリガーに訪問者メッセージを渡す） ──
      const hospitalityPrompt = await loadHospitalityGuidelines(data.content);

      // ── Step 2: RAG ハイブリッド検索 ──
      const ragResults = await searchRAG(data.content);
      const ragContext = ragResults.map((r) => r.content).join("\n\n---\n\n");

      // ── Step 3: 動的コンテキスト構築（(default) read-only） ──
      const customerContext = await buildCustomerContext(visitorId);

      // ── Step 4: 会話履歴取得 ──
      const historySnap = await chatDb
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
      await chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
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
      await chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
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
 * 日次レート制限 — chat DB の chat_rate_limits/{visitorId_yyyymmdd} をトランザクションで加算
 * （client からは default deny で触れない。Fn のみが書く）
 */
async function checkDailyRateLimit(visitorId: string): Promise<boolean> {
  const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const ref = chatDb.doc(`chat_rate_limits/${visitorId}_${dateKey}`);

  return chatDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? (snap.data()?.count as number) : 0) || 0;
    if (count >= DAILY_AI_LIMIT_PER_VISITOR) return false;
    tx.set(
      ref,
      {
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
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
async function buildCustomerContext(visitorId: string): Promise<string> {
  const parts: string[] = [];

  // 顧客プロファイル（(default)/users/{uid}）
  const userSnap = await defaultDb.doc(`users/${visitorId}`).get();
  if (userSnap.exists) {
    const u = userSnap.data()!;
    const name = (u.displayName as string) || (u.name as string) || "不明";
    parts.push(`顧客名: ${name}`);
  } else {
    parts.push("顧客: 匿名ユーザー");
  }

  // 購入状況（(default)/orders where userId == uid）
  const ordersSnap = await defaultDb
    .collection("orders")
    .where("userId", "==", visitorId)
    .limit(10)
    .get();

  if (!ordersSnap.empty) {
    // createdAt は number(ms) / Firestore Timestamp のどちらでも扱えるように
    const toMillis = (v: unknown): number =>
      typeof v === "number"
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
  const esimSnap = await defaultDb
    .collection("esim_links")
    .where("userId", "==", visitorId)
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
  // セッションにフラグ設定（chat DB）
  await sessionRef.update({ escalated: true });

  // 顧客名取得（(default)/users read-only）
  const userSnap = await defaultDb.doc(`users/${visitorId}`).get();
  const customerName = userSnap.exists
    ? (userSnap.data()?.displayName as string) ||
      (userSnap.data()?.name as string) ||
      "匿名"
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
