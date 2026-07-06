"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHospitalityGuidelines = loadHospitalityGuidelines;
exports.searchRAG = searchRAG;
exports.generateAIResponse = generateAIResponse;
exports.generateSummary = generateSummary;
exports.generateEmbedding = generateEmbedding;
const genai_1 = require("@google/genai");
const db_1 = require("../db");
const config_1 = require("../config");
/** Gen AI クライアント（Vertex AI・ADC 認証） */
let genAI;
function getGenAI() {
    if (!genAI) {
        genAI = new genai_1.GoogleGenAI({
            vertexai: true,
            project: config_1.GCP_PROJECT_ID,
            location: config_1.VERTEX_LOCATION,
        });
    }
    return genAI;
}
/** AI応答の構造化出力スキーマ */
const responseSchema = {
    type: genai_1.Type.OBJECT,
    properties: {
        answer: { type: genai_1.Type.STRING, description: "AI回答テキスト" },
        resolved: { type: genai_1.Type.BOOLEAN, description: "問題が解決したか" },
        escalationReason: {
            type: genai_1.Type.STRING,
            description: "未解決の場合の理由（resolved=true なら空文字）",
        },
        language: {
            type: genai_1.Type.STRING,
            description: "回答の言語コード (ja, en, zh, ko, th, vi)",
        },
    },
    required: ["answer", "resolved", "escalationReason", "language"],
};
/**
 * ホスピタリティ基準を Firestore から読み込み、system prompt に変換
 */
async function loadHospitalityGuidelines() {
    const snap = await db_1.chatDb
        .collection("chat_hospitality_guidelines")
        .where("isActive", "==", true)
        .orderBy("priority", "asc")
        .get();
    if (snap.empty)
        return "";
    const guidelines = snap.docs.map((doc) => `- ${doc.data().title}: ${doc.data().content}`);
    return `\n\n【ホスピタリティ基準 — 全ての応答に適用】\n${guidelines.join("\n")}`;
}
/**
 * RAG ハイブリッド検索: Vector Search（findNearest）
 */
async function searchRAG(query) {
    // 1. クエリの Embedding 生成
    const queryEmbedding = await generateEmbedding(query);
    // 2. Firestore Vector Search (findNearest)
    const ragRef = db_1.chatDb.collection("chat_rag_documents");
    const vectorResults = await ragRef
        .findNearest("embedding", queryEmbedding, {
        limit: config_1.RAG_TOP_K,
        distanceMeasure: "COSINE",
    })
        .get();
    // distanceThreshold フィルタリングは取得後に実施
    return vectorResults.docs
        .map((doc) => ({
        content: doc.data().content,
        score: doc.data().distance ?? 0,
    }))
        .filter((r) => r.score <= config_1.RAG_DISTANCE_THRESHOLD);
}
/**
 * Gemini でAI回答を生成（翻訳も兼用）
 */
async function generateAIResponse(params) {
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
        model: config_1.GEMINI_MODEL,
        contents,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema,
        },
    });
    const text = response.text ?? "";
    try {
        return JSON.parse(text);
    }
    catch {
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
async function generateSummary(messages) {
    const conversation = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
    const response = await getGenAI().models.generateContent({
        model: config_1.GEMINI_MODEL,
        contents: `以下のチャット会話を日本語で3行以内に要約してください。\n\n${conversation}`,
    });
    return response.text ?? "";
}
/**
 * text-embedding-004 でベクトル生成（768次元）
 */
async function generateEmbedding(text) {
    const response = await getGenAI().models.embedContent({
        model: config_1.GEMINI_EMBEDDING_MODEL,
        contents: text,
    });
    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
        throw new Error("Embedding 生成失敗: values が空です");
    }
    if (values.length !== config_1.EMBEDDING_DIMENSION) {
        throw new Error(`Embedding dimension mismatch: expected ${config_1.EMBEDDING_DIMENSION}, got ${values.length}`);
    }
    return values;
}
//# sourceMappingURL=ai.js.map