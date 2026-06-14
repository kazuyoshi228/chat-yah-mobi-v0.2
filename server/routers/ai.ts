import { invokeLLM } from "../_core/llm";
import {
  createMessage,
  listActiveRagDocuments,
  scheduleSessionDeletion,
  updateChatSession,
} from "../db";

const ESCALATION_KEYWORDS = {
  ja: ["人間", "オペレーター", "担当者", "スタッフ", "つないで", "繋いで", "怒", "最悪", "ひどい", "解決しない"],
  en: ["human", "operator", "agent", "staff", "person", "angry", "terrible", "awful", "not working", "escalate"],
  zh: ["人工", "客服", "转接", "愤怒", "糟糕", "无法解决"],
  es: ["humano", "operador", "agente", "persona", "enojado", "terrible", "escalar"],
  ko: ["사람", "상담원", "직원", "연결", "화나", "최악", "해결안"],
};

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  ko: "Korean",
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
): Promise<{ content: string; shouldEscalate: boolean }> {
  const langName = LANGUAGE_NAMES[language] ?? "Japanese";
  const ragContext = await searchRagDocuments(userMessage);

  const systemPrompt = `You are a helpful customer support assistant for yah.mobile, a mobile service company.
Always respond in ${langName}.
Be concise, friendly, and professional.
${ragContext ? `\n\nKnowledge base context:\n${ragContext}` : ""}

If you cannot answer the question or the user seems frustrated, suggest connecting to a human operator.`;

  const conversationHistory = history.slice(-10).map((m) => ({
    role: (m.role === "visitor" ? "user" : m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
    content: m.content,
  }));

  const response = await invokeLLM({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  const content =
    (response as any)?.choices?.[0]?.message?.content ?? "申し訳ありませんが、現在応答できません。";

  const shouldEscalate =
    detectEscalation(userMessage, language) ||
    detectEscalation(content, language);

  return { content, shouldEscalate };
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
    model: "gpt-4o-mini",
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
