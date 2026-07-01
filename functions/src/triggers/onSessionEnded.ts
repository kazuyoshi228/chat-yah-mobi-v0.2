/**
 * onSessionEnded — セッション終了時のサマリー生成 + ジャーナル記録
 *
 * トリガー: /chat_sessions/{sessionId} の更新
 * ガード: status が 'ended' に変更された場合のみ処理
 * 処理:
 *   1. サブコレクションから全メッセージ取得
 *   2. Gemini でサマリー生成
 *   3. セッションに summary + scheduledDeleteAt を書き込み
 *   4. Google Sheets 仕訳帳に最終結果を記録
 */

import {
  onDocumentUpdated,
  FirestoreEvent,
  Change,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import { generateSummary } from "../utils/ai";
import { REGION, SHEETS_JOURNAL_ID } from "../config";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onSessionEnded = onDocumentUpdated(
  {
    document: "chat_sessions/{sessionId}",
    region: REGION,
  },
  async (
    event: FirestoreEvent<
      Change<QueryDocumentSnapshot> | undefined,
      { sessionId: string }
    >
  ) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();
    const { sessionId } = event.params;

    // ── ガード: status が 'ended' に変更された場合のみ ──
    if (before.status === "ended" || after.status !== "ended") return;

    try {
      // ── Step 1: 全メッセージ取得 ──
      const messagesSnap = await db
        .collection(`chat_sessions/${sessionId}/messages`)
        .orderBy("createdAt", "asc")
        .get();

      const messages = messagesSnap.docs.map((doc) => ({
        role: doc.data().role as string,
        content: doc.data().content as string,
      }));

      // ── Step 2: Gemini でサマリー生成 ──
      const summary =
        messages.length > 0
          ? await generateSummary(messages)
          : "メッセージなし";

      // ── Step 3: セッション更新（summary + scheduledDeleteAt） ──
      const createdAt = after.createdAt as admin.firestore.Timestamp;
      const scheduledDeleteAt = new Date(
        createdAt.toDate().getTime() + 2 * 365 * 24 * 60 * 60 * 1000
      );

      const sessionRef = db.doc(`chat_sessions/${sessionId}`);
      await sessionRef.update({
        summary,
        scheduledDeleteAt: admin.firestore.Timestamp.fromDate(scheduledDeleteAt),
      });

      // ── Step 4: Google Sheets 仕訳帳に最終結果を記録 ──
      const resolved = after.escalated !== true;
      await writeToJournal(sessionId, after, summary, resolved);
    } catch (error) {
      console.error("セッション終了処理エラー:", error);
    }
  }
);

/**
 * Google Sheets 仕訳帳にセッション結果を記録
 */
async function writeToJournal(
  sessionId: string,
  sessionData: admin.firestore.DocumentData,
  summary: string,
  resolved: boolean
): Promise<void> {
  if (!SHEETS_JOURNAL_ID) return;

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const visitorId = (sessionData.visitorId as string) || "不明";
    const language = (sessionData.language as string) || "ja";

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_JOURNAL_ID,
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
  } catch (error) {
    console.error("Sheets 仕訳帳記録エラー:", error);
  }
}
