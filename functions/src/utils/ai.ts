/**
 * AI ユーティリティ — Gemini / RAG / Embedding
 *
 * Google サービスのみ使用:
 * - Gemini 2.5 Flash (LLM回答 + 翻訳)
 * - Gemini Embedding (ベクトル生成)
 * - Firestore Vector Search (RAG検索)
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { chatDb as db } from "../db";
import {
  GEMINI_MODEL,
  GEMINI_EMBEDDING_MODEL,
  EMBEDDING_DIMENSION,
  RAG_TOP_K,
  RAG_DISTANCE_THRESHOLD,
} from "../config";

/** Gemini クライアント（GCPサービスアカウント認証） */
let genAI: GoogleGenerativeAI;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    // Cloud Functions は ADC (Application Default Credentials) を自動使用
    // API キー不要
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  }
  return genAI;
}

/** AI応答の構造化出力スキーマ */
const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    answer: { type: SchemaType.STRING, description: "AI回答テキスト" },
    resolved: { type: SchemaType.BOOLEAN, description: "問題が解決したか" },
    escalationReason: {
      type: SchemaType.STRING,
      description: "未解決の場合の理由（resolved=true なら空文字）",
    },
    language: {
      type: SchemaType.STRING,
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

/**
 * ホスピタリティ基準を Firestore から読み込み、system prompt に変換
 */
export async function loadHospitalityGuidelines(): Promise<string> {
  const snap = await db
    .collection("hospitalityGuidelines")
    .where("isActive", "==", true)
    .orderBy("priority", "asc")
    .get();

  if (snap.empty) return "";

  const guidelines = snap.docs.map(
    (doc) => `- ${doc.data().title}: ${doc.data().content}`
  );

  return `\n\n【ホスピタリティ基準 — 全ての応答に適用】\n${guidelines.join("\n")}`;
}

/**
 * RAG ハイブリッド検索: Vector Search + N-gram キーワード
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
      score: doc.data().distance as number ?? 0,
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
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

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

  const history = params.conversationHistory.map((msg) => ({
    role: msg.role === "visitor" ? ("user" as const) : ("model" as const),
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(params.visitorMessage);
  const text = result.response.text();

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
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

  const conversation = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const result = await model.generateContent(
    `以下のチャット会話を日本語で3行以内に要約してください。\n\n${conversation}`
  );

  return result.response.text();
}

/**
 * Gemini Embedding でベクトル生成
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_EMBEDDING_MODEL,
  });

  const result = await model.embedContent(text);
  const embedding = result.embedding.values;

  // 次元数の検証
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
    );
  }

  return embedding;
}
