/**
 * AI ユーティリティ — Gemini（Vertex AI）/ RAG / Embedding
 *
 * 🔑 認証は ADC（Cloud Functions のサービスアカウント）。外部 API キーは持たない。
 *    → Vertex AI モード（@google/genai の vertexai:true）を使用。
 *    前提: Vertex AI API 有効化 ＋ 実行 SA に roles/aiplatform.user。
 *
 * Google サービスのみ使用:
 * - Gemini 2.5 Flash（LLM回答 + 翻訳）
 * - text-embedding-004（ベクトル生成・768次元）
 * - Firestore Vector Search（RAG検索）
 */

import { GoogleGenAI, Type } from "@google/genai";
import { chatDb as db } from "../db";
import {
  GEMINI_MODEL,
  GEMINI_EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  RAG_TOP_K,
  RAG_DISTANCE_THRESHOLD,
  GCP_PROJECT_ID,
  VERTEX_LOCATION,
} from "../config";

/** Gen AI クライアント（Vertex AI・ADC 認証） */
let genAI: GoogleGenAI | undefined;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    genAI = new GoogleGenAI({
      vertexai: true,
      project: GCP_PROJECT_ID,
      location: VERTEX_LOCATION,
    });
  }
  return genAI;
}

/** AI応答の構造化出力スキーマ */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING, description: "AI回答テキスト" },
    resolved: { type: Type.BOOLEAN, description: "問題が解決したか" },
    escalationReason: {
      type: Type.STRING,
      description: "未解決の場合の理由（resolved=true なら空文字）",
    },
    language: {
      type: Type.STRING,
      description: "回答の言語コード (ja, en, zh, ko, th, vi)",
    },
  },
  required: ["answer", "resolved", "escalationReason", "language"],
};

export interface AIResponse {
  answer: string;
  resolved: boolean;
  escalationReason: string;
  language: string;
}

/** カテゴリの表示名（プロンプト内の見出し） */
const HOSPITALITY_CATEGORY_LABEL: Record<string, string> = {
  credo: "クレド",
  steps: "サービスの3ステップ",
  tone: "トーン・言葉遣い",
  emotion: "感情マネジメント",
  oonas: "おもてなし5原則(OONAS)",
  wow: "WOW体験",
  judgment: "良い判断",
  scenario: "状況別プロトコル",
};

/** 常時注入ブロックの文字数ソフト上限（トークン肥大の抑制） */
const HOSPITALITY_ALWAYS_CHAR_CAP = 4000;

/**
 * ホスピタリティ基準を Firestore から読み込み、system prompt 用に整形。
 * - scope="always"（既定）: 常時注入（category ごとに見出し・priority 昇順）
 * - scope="situational": trigger.keywords が visitorMessage に一致した時のみ注入
 * @param visitorMessage 状況別トリガー判定に使う（省略時は状況別を出さない）
 */
export async function loadHospitalityGuidelines(
  visitorMessage?: string
): Promise<string> {
  const snap = await db
    .collection("chat_hospitality_guidelines")
    .where("isActive", "==", true)
    .get();

  if (snap.empty) return "";

  type G = {
    title?: string;
    content?: string;
    category?: string;
    priority?: number;
    scope?: string;
    trigger?: { keywords?: string[] } | null;
  };
  const docs: G[] = snap.docs.map((d) => d.data() as G);
  const sortByPriority = (a: G, b: G) => (a.priority ?? 999) - (b.priority ?? 999);

  // ── 常時（scope 未設定は always 扱い＝後方互換） ──
  const always = docs
    .filter((g) => (g.scope ?? "always") === "always")
    .sort(sortByPriority);

  // category ごとに見出し付きで整形（未知カテゴリはそのまま列挙）
  const sections: string[] = [];
  const seenCat: string[] = [];
  for (const g of always) {
    const cat = g.category ?? "";
    if (!seenCat.includes(cat)) seenCat.push(cat);
  }
  for (const cat of seenCat) {
    const items = always
      .filter((g) => (g.category ?? "") === cat)
      .map((g) => `- ${g.title}: ${g.content}`);
    const label = HOSPITALITY_CATEGORY_LABEL[cat];
    sections.push(label ? `■ ${label}\n${items.join("\n")}` : items.join("\n"));
  }
  let alwaysBlock = sections.join("\n");
  if (alwaysBlock.length > HOSPITALITY_ALWAYS_CHAR_CAP) {
    alwaysBlock = alwaysBlock.slice(0, HOSPITALITY_ALWAYS_CHAR_CAP);
  }

  // ── 状況別（キーワード一致時のみ） ──
  let situationalBlock = "";
  if (visitorMessage) {
    const msg = visitorMessage.toLowerCase();
    const matched = docs
      .filter((g) => g.scope === "situational")
      .filter((g) => {
        const kws = g.trigger?.keywords ?? [];
        return kws.some((k) => k && msg.includes(String(k).toLowerCase()));
      })
      .sort(sortByPriority)
      .map((g) => `- ${g.title}: ${g.content}`);
    if (matched.length > 0) {
      situationalBlock = `\n\n【状況別ガイド（今回の状況に該当）】\n${matched.join("\n")}`;
    }
  }

  if (!alwaysBlock && !situationalBlock) return "";
  return `\n\n【ホスピタリティ基準 — 全ての応答に適用】\n${alwaysBlock}${situationalBlock}`;
}

/**
 * RAG ハイブリッド検索: Vector Search（findNearest）
 */
export async function searchRAG(
  query: string
): Promise<{ content: string; score: number }[]> {
  // 1. クエリの Embedding 生成
  const queryEmbedding = await generateEmbedding(query);

  // 2. Firestore Vector Search (findNearest)
  const ragRef = db.collection("chat_rag_documents");
  const vectorResults = await ragRef
    .findNearest("embedding", queryEmbedding, {
      limit: RAG_TOP_K,
      distanceMeasure: "COSINE",
    })
    .get();

  // distanceThreshold フィルタリングは取得後に実施
  return vectorResults.docs
    .map((doc) => ({
      content: doc.data().content as string,
      score: (doc.data().distance as number) ?? 0,
    }))
    .filter((r) => r.score <= RAG_DISTANCE_THRESHOLD);
}

/**
 * Gemini でAI回答を生成（翻訳も兼用）
 */
export async function generateAIResponse(params: {
  visitorMessage: string;
  visitorLanguage: string;
  ragContext: string;
  customerContext: string;
  hospitalityPrompt: string;
  conversationHistory: { role: string; content: string }[];
}): Promise<AIResponse> {
  const systemPrompt = `あなたは yah.mobile のカスタマーサポート AI です。
eSIM（海外旅行用モバイルデータ通信）の専門家として、お客様を全力でサポートしてください。
${params.hospitalityPrompt}

【RAG 知識ベース（関連ドキュメント）】
${params.ragContext || "（該当する知識ベースなし）"}

【顧客情報】
${params.customerContext || "（匿名ユーザー）"}

【回答ルール】
1. 訪問者の言語（${params.visitorLanguage}）で回答してください。
2. 回答が日本語以外の場合、翻訳は不要です（直接その言語で回答）。
3. RAGの知識ベースに回答がない場合、resolved を false にしてください。
4. 返金・契約変更・技術的に解決不能な問題は resolved を false にしてください。
5. resolved が false の場合、escalationReason に理由を記載してください。
6. 常にホスピタリティ基準に従い、温かみのある対応をしてください。`;

  const contents = [
    ...params.conversationHistory.map((msg) => ({
      role: msg.role === "visitor" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: params.visitorMessage }] },
  ];

  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text ?? "";

  try {
    return JSON.parse(text) as AIResponse;
  } catch {
    // JSON パース失敗時のフォールバック
    return {
      answer: text,
      resolved: true,
      escalationReason: "",
      language: params.visitorLanguage,
    };
  }
}

/**
 * Gemini で会話サマリーを生成
 */
export async function generateSummary(
  messages: { role: string; content: string }[]
): Promise<string> {
  const conversation = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: `以下のチャット会話を日本語で3行以内に要約してください。\n\n${conversation}`,
  });

  return response.text ?? "";
}

/**
 * text-embedding-004 でベクトル生成（768次元）
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getGenAI().models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Embedding 生成失敗: values が空です");
  }
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    );
  }

  return values;
}
