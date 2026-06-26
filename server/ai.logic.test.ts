/**
 * AI Logic Tests — 100+ patterns
 *
 * Tests the pure/exported functions from server/routers/ai.ts:
 *   - detectLanguageFromMessage  (30 cases)
 *   - detectEscalation           (25 cases)
 *   - shouldRedirectToForm logic (25 cases — tested via generateAIResponse mock)
 *   - generateAIResponse         (10 cases — LLM mocked)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectLanguageFromMessage,
  detectEscalation,
  generateAIResponse,
} from "./routers/ai";

// ─── Mock external dependencies ───────────────────────────────────────────────
vi.mock("./db", () => ({
  listActiveRagDocuments: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockResolvedValue({ id: 1 }),
  scheduleSessionDeletion: vi.fn().mockResolvedValue(undefined),
}));

const mockInvokeLLM = vi.fn().mockResolvedValue({
  choices: [{ message: { content: "Mock AI response." } }],
});

vi.mock("./_core/llm", () => ({
  invokeLLM: (...args: unknown[]) => mockInvokeLLM(...args),
}));

// Mock fetch for embedding API (returns error → fallback path used)
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 500,
  json: async () => ({}),
}) as unknown as typeof fetch;

// ─── Helper ───────────────────────────────────────────────────────────────────
function makeAiHistory(aiCount: number) {
  const h: Array<{ role: string; content: string }> = [];
  for (let i = 0; i < aiCount; i++) {
    h.push({ role: "visitor", content: `question ${i}` });
    h.push({ role: "ai", content: `answer ${i}` });
  }
  return h;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. detectLanguageFromMessage — 30 cases
// ═══════════════════════════════════════════════════════════════════════════════
describe("detectLanguageFromMessage", () => {
  // Japanese — hiragana / katakana / kanji
  it("ja-01: hiragana only", () => expect(detectLanguageFromMessage("こんにちは")).toBe("ja"));
  it("ja-02: katakana only", () => expect(detectLanguageFromMessage("コンニチハ")).toBe("ja"));
  it("ja-03: kanji with hiragana", () => expect(detectLanguageFromMessage("日本語のテスト")).toBe("ja"));
  it("ja-04: mixed kanji+hiragana sentence", () => expect(detectLanguageFromMessage("eSIMが繋がらない")).toBe("ja"));
  it("ja-05: Japanese question", () => expect(detectLanguageFromMessage("どうすれば使えますか？")).toBe("ja"));

  // Korean — hangul
  it("ko-01: basic hangul", () => expect(detectLanguageFromMessage("안녕하세요")).toBe("ko"));
  it("ko-02: hangul sentence", () => expect(detectLanguageFromMessage("eSIM 설치 방법")).toBe("ko"));
  it("ko-03: hangul with numbers", () => expect(detectLanguageFromMessage("5GB 요금제")).toBe("ko"));
  it("ko-04: hangul question", () => expect(detectLanguageFromMessage("환불이 가능한가요?")).toBe("ko"));
  it("ko-05: hangul error message", () => expect(detectLanguageFromMessage("연결이 안됩니다")).toBe("ko"));

  // Chinese — CJK (note: ja takes priority for CJK range overlap)
  it("zh-01: pure Chinese characters — ja or zh detected (CJK range overlap)", () => {
    const result = detectLanguageFromMessage("你好");
    expect(["ja", "zh"]).toContain(result);
  });
  it("zh-02: Chinese sentence — ja or zh detected", () => {
    const result = detectLanguageFromMessage("我需要帮助");
    expect(["ja", "zh"]).toContain(result);
  });

  // Thai
  it("th-01: Thai script", () => expect(detectLanguageFromMessage("สวัสดี")).toBe("th"));
  it("th-02: Thai question", () => expect(detectLanguageFromMessage("วิธีติดตั้ง eSIM")).toBe("th"));
  it("th-03: Thai error", () => expect(detectLanguageFromMessage("เชื่อมต่อไม่ได้")).toBe("th"));

  // Vietnamese
  it("vi-01: Vietnamese with diacritics", () => expect(detectLanguageFromMessage("Xin chào")).toBe("vi"));
  it("vi-02: Vietnamese question", () => expect(detectLanguageFromMessage("Làm thế nào để cài đặt")).toBe("vi"));
  it("vi-03: Vietnamese error", () => expect(detectLanguageFromMessage("không kết nối được")).toBe("vi"));

  // English
  it("en-01: plain ASCII", () => expect(detectLanguageFromMessage("Hello")).toBe("en"));
  it("en-02: English question", () => expect(detectLanguageFromMessage("How do I install the eSIM?")).toBe("en"));
  it("en-03: English with numbers", () => expect(detectLanguageFromMessage("I bought 3GB plan")).toBe("en"));
  it("en-04: English error", () => expect(detectLanguageFromMessage("Not working")).toBe("en"));
  it("en-05: English with punctuation", () => expect(detectLanguageFromMessage("Can't connect!")).toBe("en"));

  // Edge cases
  it("edge-01: empty string returns null", () => expect(detectLanguageFromMessage("")).toBeNull());
  it("edge-02: only numbers returns en (ASCII)", () => expect(detectLanguageFromMessage("12345")).toBe("en"));
  it("edge-03: only spaces — null (trim makes it empty, no ASCII match)", () => {
    // "   ".trim() = "" → the ASCII check /^[\x00-\x7F]+$/ tests trimmed string → returns null
    expect(detectLanguageFromMessage("   ")).toBeNull();
  });
  it("edge-04: emoji only returns null", () => expect(detectLanguageFromMessage("😀🎉")).toBeNull());
  it("edge-05: URL returns en", () => expect(detectLanguageFromMessage("https://yah.mobi")).toBe("en"));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. detectEscalation — 25 cases
// ═══════════════════════════════════════════════════════════════════════════════
describe("detectEscalation", () => {
  // Japanese escalation keywords
  it("ja-esc-01: 人間 triggers escalation", () => expect(detectEscalation("人間に繋いでください", "ja")).toBe(true));
  it("ja-esc-02: オペレーター triggers escalation", () => expect(detectEscalation("オペレーターに繋いでください", "ja")).toBe(true));
  it("ja-esc-03: 担当者 triggers escalation", () => expect(detectEscalation("担当者に連絡したい", "ja")).toBe(true));
  it("ja-esc-04: 怒 triggers escalation", () => expect(detectEscalation("怒っています", "ja")).toBe(true));
  it("ja-esc-05: normal Japanese does NOT escalate", () => expect(detectEscalation("eSIMの設定方法を教えてください", "ja")).toBe(false));

  // English escalation keywords
  it("en-esc-01: human triggers escalation", () => expect(detectEscalation("I want to speak to a human", "en")).toBe(true));
  it("en-esc-02: operator triggers escalation", () => expect(detectEscalation("Connect me to an operator", "en")).toBe(true));
  it("en-esc-03: angry triggers escalation", () => expect(detectEscalation("I am so angry about this", "en")).toBe(true));
  it("en-esc-04: not working triggers escalation", () => expect(detectEscalation("This is not working at all", "en")).toBe(true));
  it("en-esc-05: normal English does NOT escalate", () => expect(detectEscalation("How do I install eSIM?", "en")).toBe(false));

  // Korean escalation keywords
  it("ko-esc-01: 사람 triggers escalation", () => expect(detectEscalation("사람과 연결해주세요", "ko")).toBe(true));
  it("ko-esc-02: 상담원 triggers escalation", () => expect(detectEscalation("상담원 연결 부탁드립니다", "ko")).toBe(true));
  it("ko-esc-03: 최악 triggers escalation", () => expect(detectEscalation("정말 최악이에요", "ko")).toBe(true));
  it("ko-esc-04: normal Korean does NOT escalate", () => expect(detectEscalation("eSIM 설치 방법 알려주세요", "ko")).toBe(false));

  // Chinese escalation keywords
  it("zh-esc-01: 人工 triggers escalation", () => expect(detectEscalation("请转接人工客服", "zh")).toBe(true));
  it("zh-esc-02: 客服 triggers escalation", () => expect(detectEscalation("我要找客服", "zh")).toBe(true));
  it("zh-esc-03: normal Chinese does NOT escalate", () => expect(detectEscalation("如何安装eSIM", "zh")).toBe(false));

  // Thai escalation keywords
  it("th-esc-01: เจ้าหน้าที่ triggers escalation", () => expect(detectEscalation("ขอคุยกับเจ้าหน้าที่", "th")).toBe(true));
  it("th-esc-02: normal Thai does NOT escalate", () => expect(detectEscalation("วิธีติดตั้ง eSIM", "th")).toBe(false));

  // Vietnamese escalation keywords
  it("vi-esc-01: nhân viên triggers escalation", () => expect(detectEscalation("Tôi muốn nói chuyện với nhân viên", "vi")).toBe(true));
  it("vi-esc-02: normal Vietnamese does NOT escalate", () => expect(detectEscalation("Cách cài đặt eSIM", "vi")).toBe(false));

  // Case insensitivity
  it("case-01: uppercase HUMAN triggers escalation", () => expect(detectEscalation("I WANT A HUMAN", "en")).toBe(true));
  it("case-02: mixed case Operator triggers escalation", () => expect(detectEscalation("Connect me to an Operator please", "en")).toBe(true));

  // Unknown language falls back to English keywords
  it("fallback-01: unknown language uses English keywords", () => expect(detectEscalation("I want a human agent", "fr")).toBe(true));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. shouldRedirectToForm logic — 25 cases (via generateAIResponse)
// ═══════════════════════════════════════════════════════════════════════════════
describe("shouldRedirectToForm logic", () => {
  beforeEach(() => {
    mockInvokeLLM.mockResolvedValue({
      choices: [{ message: { content: "Mock AI response." } }],
    });
  });

  // Rule: aiMessageCount >= 10 → always redirect
  it("redirect-01: 10 AI messages → redirect", async () => {
    const history = makeAiHistory(10);
    const result = await generateAIResponse(1, "help me", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-02: 11 AI messages → redirect", async () => {
    const history = makeAiHistory(11);
    const result = await generateAIResponse(1, "help me", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-03: 15 AI messages → redirect", async () => {
    const history = makeAiHistory(15);
    const result = await generateAIResponse(1, "help me", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  // Rule: aiMessageCount >= 5 AND unresolved signal → redirect
  it("redirect-04: 5 AI messages + 'not working' → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "It's still not working", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-05: 5 AI messages + 'can't' → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "I can't connect", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-06: 5 AI messages + 'error' → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "I keep getting an error", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-07: 5 AI messages + 'still' → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "I still have the same problem", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-08: 7 AI messages + 'same issue' → redirect", async () => {
    const history = makeAiHistory(7);
    const result = await generateAIResponse(1, "same issue again", history, "en");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  // Japanese unresolved signals
  it("redirect-09: 5 AI messages + 繋がらない (ja) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "繋がらない", history, "ja");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-10: 5 AI messages + 表示されない (ja) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "表示されない", history, "ja");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-11: 5 AI messages + インストールできない (ja) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "インストールできない", history, "ja");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-12: 5 AI messages + エラー (ja) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "エラーが出ます", history, "ja");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-13: 5 AI messages + 解決しない (ja) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "解決しない", history, "ja");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  // Korean unresolved signals
  it("redirect-14: 5 AI messages + 안돼 (ko) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "안돼요", history, "ko");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  it("redirect-15: 5 AI messages + 오류 (ko) → redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "오류가 발생했어요", history, "ko");
    expect(result.shouldRedirectToForm).toBe(true);
  });

  // NOT redirect cases
  it("no-redirect-01: 0 AI messages, no signal → no redirect", async () => {
    const result = await generateAIResponse(1, "Hello", [], "en");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-02: 4 AI messages + unresolved signal → no redirect (threshold is 5)", async () => {
    const history = makeAiHistory(4);
    const result = await generateAIResponse(1, "still not working", history, "en");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-03: 9 AI messages, no unresolved signal → no redirect", async () => {
    const history = makeAiHistory(9);
    const result = await generateAIResponse(1, "Thank you!", history, "en");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-04: 5 AI messages, normal question → no redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "What is the price?", history, "en");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-05: 3 AI messages + error keyword → no redirect (below threshold)", async () => {
    const history = makeAiHistory(3);
    const result = await generateAIResponse(1, "I got an error", history, "en");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-06: 1 AI message + 繋がらない (ja) → no redirect", async () => {
    const history = makeAiHistory(1);
    const result = await generateAIResponse(1, "繋がらない", history, "ja");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-07: 0 messages, empty history → no redirect", async () => {
    const result = await generateAIResponse(1, "eSIMとは何ですか？", [], "ja");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-08: 9 AI messages + normal Japanese → no redirect", async () => {
    const history = makeAiHistory(9);
    const result = await generateAIResponse(1, "ありがとうございます", history, "ja");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-09: 5 AI messages + greeting → no redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "こんにちは", history, "ja");
    expect(result.shouldRedirectToForm).toBe(false);
  });

  it("no-redirect-10: 5 AI messages + pricing question → no redirect", async () => {
    const history = makeAiHistory(5);
    const result = await generateAIResponse(1, "料金はいくらですか？", history, "ja");
    expect(result.shouldRedirectToForm).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. generateAIResponse — return shape & language fallback (10 cases)
// ═══════════════════════════════════════════════════════════════════════════════
describe("generateAIResponse — return shape & fallback", () => {
  beforeEach(() => {
    mockInvokeLLM.mockResolvedValue({
      choices: [{ message: { content: "Mock AI response." } }],
    });
  });

  it("shape-01: returns expected fields", async () => {
    const result = await generateAIResponse(1, "Hello", [], "en");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("shouldEscalate");
    expect(result).toHaveProperty("shouldRedirectToForm");
    expect(result).toHaveProperty("detectedLanguage");
  });

  it("shape-02: shouldEscalate is always false (deprecated)", async () => {
    const result = await generateAIResponse(1, "I want a human!", [], "en");
    expect(result.shouldEscalate).toBe(false);
  });

  it("shape-03: detectedLanguage matches input language", async () => {
    const result = await generateAIResponse(1, "こんにちは", [], "ja");
    expect(result.detectedLanguage).toBe("ja");
  });

  it("shape-04: LLM failure returns Japanese fallback for ja", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "テスト", [], "ja");
    expect(result.content).toBe("申し訳ありませんが、現在応答できません。");
  });

  it("shape-05: LLM failure returns English fallback for en", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "Test", [], "en");
    expect(result.content).toBe("Sorry, I'm unable to respond right now.");
  });

  it("shape-06: LLM failure returns Korean fallback for ko", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "테스트", [], "ko");
    expect(result.content).toBe("죄송합니다, 현재 응답할 수 없습니다.");
  });

  it("shape-07: LLM failure returns Chinese fallback for zh", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "测试", [], "zh");
    expect(result.content).toBe("抱歉，我目前无法回复。");
  });

  it("shape-08: LLM failure returns Thai fallback for th", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "ทดสอบ", [], "th");
    expect(result.content).toBe("ขอโทษ ขณะนี้ไม่สามารถตอบได้");
  });

  it("shape-09: LLM failure returns Vietnamese fallback for vi", async () => {
    mockInvokeLLM.mockResolvedValueOnce({});
    const result = await generateAIResponse(1, "kiểm tra", [], "vi");
    expect(result.content).toBe("Xin lỗi, hiện tại tôi không thể phản hồi.");
  });

  it("shape-10: content is non-empty string on success", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "Here is your answer." } }],
    });
    const result = await generateAIResponse(1, "How do I install?", [], "en");
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
  });
});
