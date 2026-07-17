/**
 * onVisitorMessageCreated — メインAI応答トリガー（chat DB）
 *
 * トリガー: [chat DB] /chat_sessions/{sessionId}/chat_messages/{messageId} の作成
 * 処理:
 *   0. コスト保護（バースト/日次レート制限 → utils/rateLimits）
 *   1. ホスピタリティ基準ロード（chat DB）
 *   2. RAG ハイブリッド検索（chat DB）
 *   3. 顧客コンテキスト構築（(default) read-only → utils/customerContext）
 *   4. 会話履歴取得 → 5. Gemini 回答生成 → 6. AI回答を保存
 *   6.5 監査ログ（失敗分析 → utils/classifyFailure）
 *   7. エスカレーション判定（directToContact/未解決 → escalated フラグのみ）
 *
 * 🚨 (default) DB は read-only。書き込みは chatDb のみ。
 */

import {
  onDocumentCreated,
  FirestoreEvent,
  QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { chatDb, CHAT_DATABASE_ID } from "../db";
import {
  loadHospitalityGuidelines,
  searchRAG,
  generateAIResponse,
  AIResponse,
} from "../utils/ai";
import { checkBurstRateLimit, checkDailyRateLimit } from "../utils/rateLimits";
import { buildCustomerContext } from "../utils/customerContext";
import { getPlanCatalog } from "../utils/planCatalog";
import { classifyFailure } from "../utils/classifyFailure";
import { REGION, MAX_MESSAGES_PER_SESSION } from "../config";

/** レート制限時のシステム通知（未解決/エスカレーション扱いにしない） */
async function addSystemNotice(sessionId: string, content: string, language: string) {
  await chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
    role: "ai",
    content,
    resolved: true,
    directToContact: false,
    language,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

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
    const { sessionId, messageId } = event.params;

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
      // ── Step 0a: コスト保護（短時間の連投＝1分あたりの上限） ──
      if (!(await checkBurstRateLimit(visitorId))) {
        console.warn(`バースト制限超過: visitor=${visitorId}`);
        await addSystemNotice(
          sessionId,
          "メッセージの送信が速すぎます。少し時間をおいてからお試しください。/ You're sending messages too quickly. Please wait a moment and try again.",
          visitorLanguage
        );
        return;
      }

      // ── Step 0b: コスト保護（訪問者ごとの日次レート制限） ──
      if (!(await checkDailyRateLimit(visitorId))) {
        console.warn(`日次レート制限超過: visitor=${visitorId}`);
        await addSystemNotice(
          sessionId,
          "本日のご利用上限に達しました。お手数ですが、明日以降に再度お試しください。/ You've reached today's usage limit. Please try again tomorrow.",
          visitorLanguage
        );
        return;
      }

      // ── Step 1: ホスピタリティ基準ロード（状況別トリガーに訪問者メッセージを渡す） ──
      const hospitalityPrompt = await loadHospitalityGuidelines(data.content);

      // ── Step 2: RAG ハイブリッド検索 ──
      const ragResults = await searchRAG(data.content);
      const ragContext = ragResults.map((r) => r.content).join("\n\n---\n\n");

      // ── Step 2.5: 料金プランの正本を取得（(default)/plans・5分キャッシュ） ──
      const planCatalog = await getPlanCatalog();

      // ── Step 3: 顧客コンテキスト構築（(default) read-only） ──
      //   ＋ 冒頭デシジョンツリーで選ばれた相談メニュー（session.initialMessage）を前置し、
      //     最初の回答が分岐意図に沿うようにする（widget変更なし・非履行）。
      const { text: baseContext, customerName } =
        await buildCustomerContext(visitorId);
      const entryIntent = (session.initialMessage as string) || "";
      const customerContext = entryIntent
        ? `[Entry menu selected by visitor]: ${entryIntent}\n${baseContext}`
        : baseContext;

      // 管理画面（chat一覧/詳細）で「誰か」を表示するため、顧客名をセッションへ保存。
      // ログイン顧客のみ名前が取れる（匿名は空 → 保存しない）。変化時のみ書く。
      if (customerName && session.customerName !== customerName) {
        await sessionRef.update({ customerName });
      }

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
        planCatalog,
        conversationHistory,
      });

      // ── Step 6: AI回答をメッセージに追加 ──
      await chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
        role: "ai",
        content: aiResponse.answer,
        resolved: aiResponse.resolved,
        directToContact: aiResponse.directToContact ?? false,
        // フォーム誘導のコンテキスト（refund等）: ウィジェットが /contact のURLパラメータへ引き継ぐ
        contactCategory: aiResponse.contactCategory || null,
        contactOrderId: aiResponse.contactOrderId || null,
        language: aiResponse.language,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Step 6.5: 監査ログ（失敗分析用・chat_agent_logs） ──
      //   解決率・原因別クラスタ・会話/原因RAGリンクの元データ。
      //   ログ失敗が本体フローを止めないよう独立 try/catch。
      try {
        const ragHitCount = ragResults.length;
        await chatDb.collection("chat_agent_logs").add({
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
          failureBucket: classifyFailure(
            aiResponse.resolved,
            ragHitCount,
            data.content,
            aiResponse.escalationReason
          ),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (logErr) {
        console.error("chat_agent_logs 記録エラー:", logErr);
      }

      // ── Step 7: エスカレーション判定 ──
      //   /contact フォームへ誘導した（directToContact）or 未解決（resolved=false）
      //   ＝ エスカレーション。chat 側は escalated フラグを立てるだけ
      //   （通知・対応は販売サイトの問い合わせフォーム）。
      if (aiResponse.directToContact || !aiResponse.resolved) {
        await handleEscalation(sessionRef);
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
 * エスカレーション: chat 側は escalated フラグを立てるだけ。
 *  - 定義: resolved=false ＝ AIが解決できず /contact フォームへ誘導 ＝ エスカレーション
 *  - 通知・対応は販売サイトの問い合わせフォーム（yah.mobi/contact）が担う
 *  - 自前メール／Sheets 記録は廃止（二重通知回避）。未解決の詳細は chat_agent_logs に記録済み
 */
async function handleEscalation(
  sessionRef: admin.firestore.DocumentReference
): Promise<void> {
  await sessionRef.update({
    escalated: true,
    escalationType: "contact_form", // 問い合わせフォームへ誘導した、の意味
    escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
