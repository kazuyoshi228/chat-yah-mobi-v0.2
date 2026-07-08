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
import { chatDb, defaultDb, CHAT_DATABASE_ID } from "../db";
import {
  loadHospitalityGuidelines,
  searchRAG,
  generateAIResponse,
  AIResponse,
} from "../utils/ai";
import {
  REGION,
  MAX_MESSAGES_PER_SESSION,
  DAILY_AI_LIMIT_PER_VISITOR,
  AI_RATE_LIMIT_PER_MINUTE,
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
      const withinBurst = await checkBurstRateLimit(visitorId);
      if (!withinBurst) {
        console.warn(`バースト制限超過: visitor=${visitorId}`);
        await chatDb
          .collection(`chat_sessions/${sessionId}/chat_messages`)
          .add({
            role: "ai",
            content:
              "メッセージの送信が速すぎます。少し時間をおいてからお試しください。/ You're sending messages too quickly. Please wait a moment and try again.",
            resolved: true, // システム通知（未解決/エスカレーション扱いにしない）
            directToContact: false,
            language: visitorLanguage,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        return;
      }

      // ── Step 0b: コスト保護（訪問者ごとの日次レート制限・Firestore カウンタ） ──
      const withinLimit = await checkDailyRateLimit(visitorId);
      if (!withinLimit) {
        console.warn(`日次レート制限超過: visitor=${visitorId}`);
        await chatDb
          .collection(`chat_sessions/${sessionId}/chat_messages`)
          .add({
            role: "ai",
            content:
              "本日のご利用上限に達しました。お手数ですが、明日以降に再度お試しください。/ You've reached today's usage limit. Please try again tomorrow.",
            resolved: true, // システム通知（未解決/エスカレーション扱いにしない）
            directToContact: false,
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
        conversationHistory,
      });

      // ── Step 6: AI回答をメッセージに追加 ──
      await chatDb.collection(`chat_sessions/${sessionId}/chat_messages`).add({
        role: "ai",
        content: aiResponse.answer,
        resolved: aiResponse.resolved,
        directToContact: aiResponse.directToContact ?? false,
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
 * 失敗の原因分類（ルールベース・追加API無し）
 * - resolved            : 解決（失敗ではない）
 * - knowledge_gap       : RAGヒット0（該当知識なし＝L1自動ドラフトの対象）
 * - account_or_emotional: 注文/eSIM/返金/怒り/人間希望 等（AI単独では不可の領域）
 * - answer_quality      : 上記以外の未解決（文書はあるが解決に至らず）
 */
function classifyFailure(
  resolved: boolean,
  ragHitCount: number,
  question: string,
  escalationReason: string
): string {
  if (resolved) return "resolved";
  if (ragHitCount === 0) return "knowledge_gap";
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
 * バースト制限 — 直近1分あたりの上限。chat_rate_limits/{visitorId}_min_{yyyymmddHHMM} を加算。
 * 短時間の連投（無駄打ち/濫用）を抑える。
 */
async function checkBurstRateLimit(visitorId: string): Promise<boolean> {
  const minuteKey = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, ""); // yyyymmddHHMM
  const ref = chatDb.doc(`chat_rate_limits/${visitorId}_min_${minuteKey}`);

  return chatDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? (snap.data()?.count as number) : 0) || 0;
    if (count >= AI_RATE_LIMIT_PER_MINUTE) return false;
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
 * - フィールド実キーは yah.mobi 実データで確認済み（orders.userId/planName/status、
 *   esim_links.userId/iccid/status/planName/dataRemainingMb/dataTotalMb/expiryDate、users.name）
 */
async function buildCustomerContext(
  visitorId: string
): Promise<{ text: string; customerName: string }> {
  const parts: string[] = [];

  // 顧客プロファイル（(default)/users/{uid}）
  const userSnap = await defaultDb.doc(`users/${visitorId}`).get();
  const uname = userSnap.exists
    ? ((userSnap.data()?.name as string) ||
        (userSnap.data()?.displayName as string) ||
        "")
    : "";
  // ラベルは言語中立（英語）で。値が日本語でも回答言語は訪問者言語に固定（システムプロンプト参照）。
  if (uname) {
    parts.push(`Customer name: ${uname}`);
  } else {
    // 名前不明（匿名等）: AI が『匿名ユーザー様』等と呼ばないよう明示
    parts.push(
      "Customer name: unknown (address them politely as 'customer' in the visitor's language)"
    );
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
      .filter((d) => d.hiddenByUser !== true) // ユーザーが非表示にした注文は参照しない
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 5)
      .map((d) => {
        const plan = d.planName || d.planId || "unknown plan";
        return `- ${plan} (${d.status || "unknown"})`;
      });
    if (orders.length > 0) {
      parts.push(`\nPurchase history:\n${orders.join("\n")}`);
    }
  }

  // eSIM状態（(default)/esim_links where userId == uid）
  const esimSnap = await defaultDb
    .collection("esim_links")
    .where("userId", "==", visitorId)
    .limit(5)
    .get();

  if (!esimSnap.empty) {
    // ms(number) / 秒(number) / Timestamp を安全に ms へ
    const toMs = (v: unknown): number | null => {
      if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
      if (v instanceof admin.firestore.Timestamp) return v.toMillis();
      return null;
    };
    // MB(number) → GB表示（十進・キャリア標準 1GB=1000MB）
    const toGb = (mb: unknown): string | null =>
      typeof mb === "number" ? `${(mb / 1000).toFixed(1)}GB` : null;

    const statuses = esimSnap.docs.map((doc) => {
      const d = doc.data();
      // ICCID は機微なため下4桁のみ（本人確認の言及用・全桁は載せない）
      const iccid = d.iccid ? `****${String(d.iccid).slice(-4)}` : "unknown";
      const bits: string[] = [`ICCID ${iccid}`, `status: ${d.status || "unknown"}`];
      if (d.planName) bits.push(`plan: ${d.planName}`);
      const remain = toGb(d.dataRemainingMb);
      const total = toGb(d.dataTotalMb);
      if (remain) bits.push(`data remaining: ~${remain}${total ? ` / ${total}` : ""}`);
      const ms = toMs(d.expiryDate);
      if (ms) {
        const y = new Date(ms).getUTCFullYear();
        // 妥当な範囲の日付のみ（誤フォーマットを載せない）
        if (y >= 2024 && y <= 2032) {
          bits.push(`expires: ${new Date(ms).toISOString().slice(0, 10)}`);
        }
      }
      return `- ${bits.join(" / ")}`;
    });
    parts.push(`\neSIM status:\n${statuses.join("\n")}`);
  }

  return { text: parts.join("\n"), customerName: uname };
}

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
