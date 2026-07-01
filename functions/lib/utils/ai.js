"use strict";
/**
 * AI ユーティリティ — Gemini / RAG / Embedding
 *
 * Google サービスのみ使用:
 * - Gemini 2.5 Flash (LLM回答 + 翻訳)
 * - Gemini Embedding (ベクトル生成)
 * - Firestore Vector Search (RAG検索)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHospitalityGuidelines = loadHospitalityGuidelines;
exports.searchRAG = searchRAG;
exports.generateAIResponse = generateAIResponse;
exports.generateSummary = generateSummary;
exports.generateEmbedding = generateEmbedding;
const generative_ai_1 = require("@google/generative-ai");
const admin = __importStar(require("firebase-admin"));
const config_1 = require("../config");
const db = admin.firestore();
/** Gemini クライアント（GCPサービスアカウント認証） */
let genAI;
function getGenAI() {
    if (!genAI) {
        // Cloud Functions は ADC (Application Default Credentials) を自動使用
        // API キー不要
        genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
    }
    return genAI;
}
/** AI応答の構造化出力スキーマ */
const responseSchema = {
    type: generative_ai_1.SchemaType.OBJECT,
    properties: {
        answer: { type: generative_ai_1.SchemaType.STRING, description: "AI回答テキスト" },
        resolved: { type: generative_ai_1.SchemaType.BOOLEAN, description: "問題が解決したか" },
        escalationReason: {
            type: generative_ai_1.SchemaType.STRING,
            description: "未解決の場合の理由（resolved=true なら空文字）",
        },
        language: {
            type: generative_ai_1.SchemaType.STRING,
            description: "回答の言語コード (ja, en, zh, ko, th, vi)",
        },
    },
    required: ["answer", "resolved", "escalationReason", "language"],
};
/**
 * ホスピタリティ基準を Firestore から読み込み、system prompt に変換
 */
async function loadHospitalityGuidelines() {
    const snap = await db
        .collection("hospitalityGuidelines")
        .where("isActive", "==", true)
        .orderBy("priority", "asc")
        .get();
    if (snap.empty)
        return "";
    const guidelines = snap.docs.map((doc) => `- ${doc.data().title}: ${doc.data().content}`);
    return `\n\n【ホスピタリティ基準 — 全ての応答に適用】\n${guidelines.join("\n")}`;
}
/**
 * RAG ハイブリッド検索: Vector Search + N-gram キーワード
 */
async function searchRAG(query) {
    // 1. クエリの Embedding 生成
    const queryEmbedding = await generateEmbedding(query);
    // 2. Firestore Vector Search (findNearest)
    const ragRef = db.collection("chat_rag_documents");
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
    const model = getGenAI().getGenerativeModel({
        model: config_1.GEMINI_MODEL,
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
        role: msg.role === "visitor" ? "user" : "model",
        parts: [{ text: msg.content }],
    }));
    const chat = model.startChat({
        history,
        systemInstruction: systemPrompt,
    });
    const result = await chat.sendMessage(params.visitorMessage);
    const text = result.response.text();
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
    const model = getGenAI().getGenerativeModel({ model: config_1.GEMINI_MODEL });
    const conversation = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
    const result = await model.generateContent(`以下のチャット会話を日本語で3行以内に要約してください。\n\n${conversation}`);
    return result.response.text();
}
/**
 * Gemini Embedding でベクトル生成
 */
async function generateEmbedding(text) {
    const model = getGenAI().getGenerativeModel({
        model: config_1.GEMINI_EMBEDDING_MODEL,
    });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    // 次元数の検証
    if (embedding.length !== config_1.EMBEDDING_DIMENSION) {
        throw new Error(`Embedding dimension mismatch: expected ${config_1.EMBEDDING_DIMENSION}, got ${embedding.length}`);
    }
    return embedding;
}
//# sourceMappingURL=ai.js.map