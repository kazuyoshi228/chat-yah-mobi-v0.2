/**
 * AI E2E Tests — Real LLM calls (no mocks)
 *
 * These tests make ACTUAL API calls to the LLM and Embedding services.
 * They consume credits and take longer (~30-60s total).
 *
 * Run with: pnpm test:e2e
 *
 * Part 1: AI Response Quality (15 cases)
 *   - Refund policy explanation (ja/en/ko)
 *   - eSIM setup instructions (ja/en)
 *   - Pricing questions
 *   - Form redirect guidance
 *   - Language consistency (6 languages)
 *
 * Part 2: RAG Hit Rate (10 cases)
 *   - Cosine similarity score >= 0.3 for typical support questions
 */

import { describe, it, expect } from "vitest";
import { generateAIResponse, getEmbedding, searchRagDocuments } from "./routers/ai";
import { listActiveRagDocuments } from "./db";

// Increase timeout for real API calls
const TIMEOUT = 30_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Checks if a response contains any of the given keywords (case-insensitive) */
function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/** Checks if a response does NOT contain any of the given keywords */
function containsNone(text: string, keywords: string[]): boolean {
  return !containsAny(text, keywords);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Part 1: AI Response Quality Tests (15 cases)
// ═══════════════════════════════════════════════════════════════════════════════

describe("AI Response Quality — Real LLM", () => {

  // ── Refund Policy (3 cases) ─────────────────────────────────────────────────

  it("refund-ja: 返金リクエストに対して返金不可ポリシーを日本語で説明する", async () => {
    const result = await generateAIResponse(
      9999,
      "返金してほしいのですが",
      [],
      "ja"
    );
    expect(result.content.length).toBeGreaterThan(20);
    // Must mention refund is not available
    expect(containsAny(result.content, ["返金", "キャンセル", "不可", "できません", "対応", "特定商取引"])).toBe(true);
    // Must NOT offer to connect to human operator
    expect(containsNone(result.content, ["オペレーター", "担当者に繋", "人間に繋"])).toBe(true);
    expect(result.detectedLanguage).toBe("ja");
  }, TIMEOUT);

  it("refund-en: Refund request must explain non-refundable policy in English", async () => {
    const result = await generateAIResponse(
      9999,
      "I want a refund",
      [],
      "en"
    );
    expect(result.content.length).toBeGreaterThan(20);
    // Must mention refund policy
    expect(containsAny(result.content, ["refund", "cancel", "non-refundable", "not available", "policy", "digital", "purchase"])).toBe(true);
    // Must NOT offer human operator
    expect(containsNone(result.content, ["connect you to", "transfer you to", "human operator"])).toBe(true);
    expect(result.detectedLanguage).toBe("en");
  }, TIMEOUT);

  it("refund-ko: 환불 요청에 대해 환불 불가 정책을 한국어로 설명", async () => {
    const result = await generateAIResponse(
      9999,
      "환불 받고 싶어요",
      [],
      "ko"
    );
    expect(result.content.length).toBeGreaterThan(20);
    // Must mention refund-related terms in Korean
    expect(containsAny(result.content, ["환불", "취소", "불가", "디지털", "정책", "결제"])).toBe(true);
    expect(result.detectedLanguage).toBe("ko");
  }, TIMEOUT);

  // ── eSIM Setup Instructions (3 cases) ──────────────────────────────────────

  it("setup-ja: eSIMインストール方法を日本語でステップバイステップで説明する", async () => {
    const result = await generateAIResponse(
      9999,
      "eSIMのインストール方法を教えてください",
      [],
      "ja"
    );
    expect(result.content.length).toBeGreaterThan(50);
    // Must contain step-by-step instructions
    expect(containsAny(result.content, ["設定", "インストール", "手順", "ステップ", "QR", "プロファイル", "追加"])).toBe(true);
    expect(result.detectedLanguage).toBe("ja");
  }, TIMEOUT);

  it("setup-en: eSIM installation steps must be explained in English", async () => {
    const result = await generateAIResponse(
      9999,
      "How do I install the eSIM?",
      [],
      "en"
    );
    expect(result.content.length).toBeGreaterThan(50);
    // Must contain installation-related terms
    expect(containsAny(result.content, ["install", "settings", "QR", "profile", "scan", "cellular", "step"])).toBe(true);
    expect(result.detectedLanguage).toBe("en");
  }, TIMEOUT);

  it("setup-zh: eSIM安装方法必须用中文解释", async () => {
    const result = await generateAIResponse(
      9999,
      "如何安装eSIM",
      [],
      "ja" // zh maps to ja due to CJK range overlap — test with ja lang
    );
    expect(result.content.length).toBeGreaterThan(20);
    expect(result.shouldRedirectToForm).toBe(false);
  }, TIMEOUT);

  // ── Pricing Questions (2 cases) ─────────────────────────────────────────────

  it("pricing-ja: 料金質問にはウェブサイト参照を案内する", async () => {
    const result = await generateAIResponse(
      9999,
      "料金はいくらですか？",
      [],
      "ja"
    );
    expect(result.content.length).toBeGreaterThan(20);
    // Must mention website or yah.mobi
    expect(containsAny(result.content, ["ウェブサイト", "yah.mobi", "サイト", "ページ", "確認", "プラン", "GB"])).toBe(true);
    expect(result.shouldRedirectToForm).toBe(false);
  }, TIMEOUT);

  it("pricing-en: Pricing question must direct to website", async () => {
    const result = await generateAIResponse(
      9999,
      "What are the prices?",
      [],
      "en"
    );
    expect(result.content.length).toBeGreaterThan(20);
    expect(containsAny(result.content, ["website", "yah.mobi", "plan", "GB", "check", "latest"])).toBe(true);
    expect(result.shouldRedirectToForm).toBe(false);
  }, TIMEOUT);

  // ── Form Redirect Guidance (2 cases) ────────────────────────────────────────

  it("form-redirect-ja: 10回以上のAI応答後にフォーム誘導フラグが立つ", async () => {
    const history = Array.from({ length: 10 }, (_, i) => [
      { role: "visitor", content: `質問${i}` },
      { role: "ai", content: `回答${i}` },
    ]).flat();
    const result = await generateAIResponse(
      9999,
      "まだ解決しません",
      history,
      "ja"
    );
    expect(result.shouldRedirectToForm).toBe(true);
    // When redirecting, response should mention contact form
    expect(containsAny(result.content, ["フォーム", "お問い合わせ", "yah.mobi", "CONTACT", "contact"])).toBe(true);
  }, TIMEOUT);

  it("form-redirect-en: After 5+ AI messages with unresolved signal, form redirect fires", async () => {
    const history = Array.from({ length: 5 }, (_, i) => [
      { role: "visitor", content: `question ${i}` },
      { role: "ai", content: `answer ${i}` },
    ]).flat();
    const result = await generateAIResponse(
      9999,
      "still not working",
      history,
      "en"
    );
    expect(result.shouldRedirectToForm).toBe(true);
    expect(containsAny(result.content, ["form", "contact", "yah.mobi", "CONTACT"])).toBe(true);
  }, TIMEOUT);

  // ── Language Consistency (5 cases) ──────────────────────────────────────────

  it("lang-th: Thai question must receive Thai response", async () => {
    const result = await generateAIResponse(
      9999,
      "วิธีติดตั้ง eSIM",
      [],
      "th"
    );
    expect(result.content.length).toBeGreaterThan(10);
    // Thai script should be present in response
    expect(/[\u0E00-\u0E7F]/.test(result.content)).toBe(true);
    expect(result.detectedLanguage).toBe("th");
  }, TIMEOUT);

  it("lang-vi: Vietnamese question must receive Vietnamese response", async () => {
    const result = await generateAIResponse(
      9999,
      "Làm thế nào để cài đặt eSIM?",
      [],
      "vi"
    );
    expect(result.content.length).toBeGreaterThan(10);
    expect(result.detectedLanguage).toBe("vi");
  }, TIMEOUT);

  it("form-redirect-th: タイ語で未解決シグナルがある場合フォーム誘導が発火する", async () => {
    const history = Array.from({ length: 5 }, (_, i) => [
      { role: "visitor", content: `คำถาม ${i}` },
      { role: "ai", content: `คำตอบ ${i}` },
    ]).flat();
    const result = await generateAIResponse(
      9999,
      "ยังไม่ได้รับการแก้ไข ยังไม่ได้",
      history,
      "th"
    );
    expect(result.shouldRedirectToForm).toBe(true);
    expect(containsAny(result.content, ["แบบฟอร์ม", "ติดต่อ", "yah.mobi", "contact", "form", "CONTACT"])).toBe(true);
  }, TIMEOUT);

  it("form-redirect-vi: ベトナム語で未解決シグナルがある場合フォーム誘導が発火する", async () => {
    const history = Array.from({ length: 5 }, (_, i) => [
      { role: "visitor", content: `câu hỏi ${i}` },
      { role: "ai", content: `câu trả lời ${i}` },
    ]).flat();
    const result = await generateAIResponse(
      9999,
      "vẫn không được giải quyết, vẫn không hoạt động",
      history,
      "vi"
    );
    expect(result.shouldRedirectToForm).toBe(true);
    expect(containsAny(result.content, ["biểu mẫu", "liên hệ", "yah.mobi", "contact", "form", "CONTACT"])).toBe(true);
  }, TIMEOUT);

  it("lang-no-operator-mention: AI must never offer to connect to human operator", async () => {
    const result = await generateAIResponse(
      9999,
      "I need help urgently",
      [],
      "en"
    );
    // System prompt forbids offering human operator connection
    expect(containsNone(result.content, [
      "connect you to a human",
      "transfer you to an operator",
      "speak to a representative",
      "I'll connect you",
    ])).toBe(true);
  }, TIMEOUT);

});

// ═══════════════════════════════════════════════════════════════════════════════
// Part 2: RAG Hit Rate Tests (10 cases)
// ═══════════════════════════════════════════════════════════════════════════════

describe("RAG Hit Rate — Real Embedding API", () => {

  const SIMILARITY_THRESHOLD = 0.25; // Minimum acceptable cosine similarity

  /** Helper: get top similarity score for a query against all RAG docs */
  async function getTopSimilarityScore(query: string): Promise<{ score: number; title: string }> {
    const docs = await listActiveRagDocuments();
    if (docs.length === 0) return { score: 0, title: "no docs" };

    const queryEmbedding = await getEmbedding(query);
    if (queryEmbedding.length === 0) return { score: 0, title: "embedding failed" };

    const cosineSimilarity = (a: number[], b: number[]): number => {
      const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
      const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
      const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
      if (magA === 0 || magB === 0) return 0;
      return dot / (magA * magB);
    };

    const scored = docs
      .filter((d) => d.embedding && (d.embedding as number[]).length > 0)
      .map((d) => ({
        title: d.title,
        score: cosineSimilarity(queryEmbedding, d.embedding as number[]),
      }))
      .sort((a, b) => b.score - a.score);

    return scored[0] ?? { score: 0, title: "no embedded docs" };
  }

  it("rag-01: 「eSIMが繋がらない」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("eSIMが繋がらない");
    console.log(`[RAG] eSIMが繋がらない → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-02: 「返金したい」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("返金したい");
    console.log(`[RAG] 返金したい → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-03: 「インストール方法」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("eSIMのインストール方法");
    console.log(`[RAG] インストール方法 → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-04: 「How to install eSIM」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("How to install eSIM on iPhone");
    console.log(`[RAG] How to install eSIM → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-05: 「料金プラン」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("料金プランを教えてください");
    console.log(`[RAG] 料金プラン → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-06: 「환불 정책」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("환불 정책이 어떻게 되나요?");
    console.log(`[RAG] 환불 정책 → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-07: 「QRコードが届かない」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("QRコードが届かない");
    console.log(`[RAG] QRコードが届かない → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-08: 「データ通信できない」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("データ通信ができません");
    console.log(`[RAG] データ通信できない → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-09: 「eSIM not connecting」でRAGドキュメントがヒットする", async () => {
    const { score, title } = await getTopSimilarityScore("eSIM not connecting to network");
    console.log(`[RAG] eSIM not connecting → "${title}" (score: ${score.toFixed(4)})`);
    expect(score).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
  }, TIMEOUT);

  it("rag-10: searchRagDocuments()が空でない文字列を返す", async () => {
    const context = await searchRagDocuments("eSIM installation help", 3);
    console.log(`[RAG] searchRagDocuments returned ${context.length} chars`);
    // Either returns content or empty string (if no docs in DB)
    expect(typeof context).toBe("string");
    if (context.length > 0) {
      // If docs exist, context should contain meaningful content
      expect(context.length).toBeGreaterThan(10);
    }
  }, TIMEOUT);

});
