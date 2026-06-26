import { invokeLLM } from "../_core/llm";
import {
  createMessage,
  listActiveRagDocuments,
  scheduleSessionDeletion,
} from "../db";

const ESCALATION_KEYWORDS = {
  ja: ["人間", "オペレーター", "担当者", "スタッフ", "つないで", "繋いで", "怒", "最悪", "ひどい", "解決しない"],
  en: ["human", "operator", "agent", "staff", "person", "angry", "terrible", "awful", "not working", "escalate"],
  zh: ["人工", "客服", "转接", "愤怒", "糟糕", "无法解决"],
  ko: ["사람", "상담원", "직원", "연결", "화나", "최악", "해결안"],
  th: ["คน", "เจ้าหน้าที่", "ผู้ดูแล", "โกรธ", "แย่มาก", "แก้ไขไม่ได้"],
  vi: ["người", "nhân viên", "tổng đài", "tức giận", "tệ", "không giải quyết"],
};

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
};

// Cosine similarity for RAG
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// Get text embedding via LLM API
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(
      `${process.env.BUILT_IN_FORGE_API_URL}/v1/embeddings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
        }),
      }
    );
    if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
    const data = (await response.json()) as any;
    return data.data[0].embedding as number[];
  } catch (e) {
    console.warn("[AI] Embedding failed, returning empty vector:", e);
    return [];
  }
}

// Search RAG documents by cosine similarity (only non-expired docs)
export async function searchRagDocuments(query: string, topK = 3): Promise<string> {
  const docs = await listActiveRagDocuments();
  if (docs.length === 0) return "";

  const queryEmbedding = await getEmbedding(query);
  if (queryEmbedding.length === 0) {
    // Fallback: return first 3 docs content
    return docs
      .slice(0, topK)
      .map((d) => `[${d.title}]\n${d.content}`)
      .join("\n\n");
  }

  const scored = docs
    .filter((d) => d.embedding && (d.embedding as number[]).length > 0)
    .map((d) => ({
      doc: d,
      score: cosineSimilarity(queryEmbedding, d.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) {
    return docs
      .slice(0, topK)
      .map((d) => `[${d.title}]\n${d.content}`)
      .join("\n\n");
  }

  return scored.map((s) => `[${s.doc.title}]\n${s.doc.content}`).join("\n\n");
}

// Detect language from message content
export function detectLanguageFromMessage(message: string): string | null {
  // Japanese: hiragana, katakana, kanji
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(message)) return "ja";
  // Korean: hangul
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(message)) return "ko";
  // Chinese: CJK unified (no hiragana/katakana)
  if (/[\u4E00-\u9FFF]/.test(message) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(message)) return "zh";
  // Thai: Thai script
  if (/[\u0E00-\u0E7F]/.test(message)) return "th";
  // Vietnamese: Latin with Vietnamese diacritics
  if (/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(message)) return "vi";
  // English: mostly ASCII letters
  if (/^[\x00-\x7F]+$/.test(message.trim())) return "en";
  return null;
}

// Detect escalation need
export function detectEscalation(message: string, language: string): boolean {
  const lang = language in ESCALATION_KEYWORDS ? language : "en";
  const keywords = ESCALATION_KEYWORDS[lang as keyof typeof ESCALATION_KEYWORDS] ?? [];
  const lower = message.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// Generate AI response
export async function generateAIResponse(
  sessionId: number,
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  language: string
): Promise<{ content: string; shouldEscalate: boolean; shouldRedirectToForm: boolean; detectedLanguage: string }> {
  // Count how many AI responses have already been sent in this session
  const aiMessageCount = history.filter((m) => m.role === "ai").length;
  // Use provided language (detection and DB update are handled by the caller)
  const detectedLang = language;
  const langName = LANGUAGE_NAMES[detectedLang] ?? "English";
  const ragContext = await searchRagDocuments(userMessage);

  const systemPrompt = `You are a helpful customer support assistant for yah.mobile, a Japan-only eSIM service for international travelers.
Always respond in ${langName}.

## About yah.mobile
- Japan-only eSIM service for international travelers
- Industry-lowest price per GB
- 24/7 support in 6 languages (Japanese, English, Chinese, Korean, Thai, Vietnamese)

## Response Style
- Be concise, polite, and professional
- Prefer natural sentences over bullet points
- For eSIM setup questions, always explain step-by-step
- For pricing questions, direct users to the website for the latest information
- Aim to resolve 99.9% of inquiries through AI chat without any human escalation
- Never say "I'll check and get back to you" or "I'll connect you to a human operator" — always try to answer directly or guide to the contact form

## Rules for Unanswerable Questions
- For pricing/plan details: tell users to check the website for the latest information
- For questions involving personal information or account-specific issues: guide the user to the contact form at yah.mobi/app (scroll to the CONTACT section)
- For technical eSIM setup: explain the steps carefully and patiently
- For refund requests: Explain clearly that eSIM is a digital product and refunds/cancellations are NOT available once payment is complete, per Japan's Act on Specified Commercial Transactions Article 15-3. The customer consented to this policy via checkbox during purchase. For exceptional cases (yah.mobile system failure causing eSIM not issued, confirmed duplicate charge, unauthorized credit card use), guide the user to the contact form at yah.mobi/app.
- If after 10 attempts you still cannot resolve the issue, guide the user to the contact form: "For further assistance, please use our contact form at yah.mobi/app (scroll to the CONTACT section). We'll respond within 2 hours during business hours."
${ragContext ? `\n## Knowledge Base\n${ragContext}` : ""}`;

  // Use full conversation history for complete context.
  // For very long conversations (30+ messages), prepend a rolling summary to avoid token limits.
  const SUMMARY_THRESHOLD = 30;
  let messagesForLLM: Array<{ role: "user" | "assistant"; content: string }>;
  if (history.length > SUMMARY_THRESHOLD) {
    // Summarize older messages, keep recent 20 verbatim
    const olderMessages = history.slice(0, -20);
    const recentMessages = history.slice(-20);
    const olderText = olderMessages
      .map((m) => `${m.role === "visitor" ? "User" : m.role === "ai" ? "AI" : "Operator"}: ${m.content}`)
      .join("\n");
    const summaryMsg: { role: "user" | "assistant"; content: string } = {
      role: "user",
      content: `[Earlier conversation summary]\n${olderText}\n[End of summary — recent messages follow]`,
    };
    messagesForLLM = [
      summaryMsg,
      ...recentMessages.map((m) => ({
        role: (m.role === "visitor" ? "user" : m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      })),
    ];
  } else {
    messagesForLLM = history.map((m) => ({
      role: (m.role === "visitor" ? "user" : m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));
  }

  const response = await invokeLLM({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...messagesForLLM,
      { role: "user", content: userMessage },
    ],
  });

  const FALLBACK: Record<string, string> = {
    ja: "申し訳ありませんが、現在応答できません。",
    en: "Sorry, I'm unable to respond right now.",
    ko: "죄송합니다, 현재 응답할 수 없습니다.",
    zh: "抱歉，我目前无法回复。",
    th: "ขอโทษ ขณะนี้ไม่สามารถตอบได้",
    vi: "Xin lỗi, hiện tại tôi không thể phản hồi.",
  };
  const content =
    (response as any)?.choices?.[0]?.message?.content ??
    FALLBACK[detectedLang] ??
    FALLBACK["en"];

  // shouldEscalate is kept for backward compat but no longer triggers operator handoff
  const shouldEscalate = false;

  // Redirect to contact form if AI has tried 10+ times and user still has issues
  // Detect unresolved signals: user repeating a question or expressing frustration
  const UNRESOLVED_SIGNALS: Record<string, string[]> = {
    ja: ["解決しない", "わからない", "できない", "うまくいかない", "また", "もう一度", "同じ", "繋がらない", "表示されない", "インストールできない", "使えない", "開かない", "エラー", "失敗", "困って", "困った", "助けて"],
    en: ["still", "not working", "doesn't work", "can't", "cannot", "again", "same issue", "same problem", "not resolved", "not connecting", "not showing", "failed", "error", "help me", "stuck"],
    zh: ["还是", "仍然", "不行", "不能", "再次", "同样", "连不上", "显示不了", "安装失败", "错误"],
    ko: ["여전히", "안돼", "안되", "또", "같은", "해결안", "연결안", "표시안", "설치안", "오류"],
    th: ["ยังไม่", "ไม่ได้", "อีกครั้ง", "ยังคง", "เชื่อมต่อไม่ได้", "ไม่แสดง", "ติดตั้งไม่ได้", "ข้อผิดพลาด"],
    vi: ["vẫn", "không được", "lại", "cùng vấn đề", "không kết nối", "không hiển thị", "lỗi", "cài đặt thất bại"],
  };
  const unresolvedKeywords = UNRESOLVED_SIGNALS[detectedLang] ?? UNRESOLVED_SIGNALS["en"];
  const userLower = userMessage.toLowerCase();
  const userSignalsUnresolved = unresolvedKeywords.some((kw) => userLower.includes(kw));
  // OR condition: redirect if 10+ AI attempts OR user signals unresolved after 5+ attempts
  const shouldRedirectToForm = aiMessageCount >= 10 || (aiMessageCount >= 5 && userSignalsUnresolved);

  return { content, shouldEscalate, shouldRedirectToForm, detectedLanguage: detectedLang };
}

// Generate conversation summary
export async function generateSummary(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (messages.length === 0) return "";

  const conversation = messages
    .map((m) => `${m.role === "visitor" ? "Visitor" : m.role === "operator" ? "Operator" : "AI"}: ${m.content}`)
    .join("\n");

  const response = await invokeLLM({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Summarize the following customer support conversation in 2-3 sentences in Japanese. Focus on the main issue and resolution.",
      },
      { role: "user", content: conversation },
    ],
  });

  return (response as any)?.choices?.[0]?.message?.content ?? "";
}
