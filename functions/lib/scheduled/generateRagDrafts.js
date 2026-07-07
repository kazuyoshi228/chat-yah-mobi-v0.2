"use strict";
/**
 * generateRagDrafts — L1: 知識欠落の修正ドラフトを自動生成（週次）
 *
 * スケジュール: 毎週月曜 00:00 UTC（= JST 09:00）
 * 処理:
 *   1. 直近の chat_agent_logs（failureBucket == "knowledge_gap"）を収集
 *   2. 質問を簡易クラスタリング（単語Jaccard・ベストエフォート）
 *   3. クラスタごとに Gemini で6言語ドラフトを生成
 *   4. chat_rag_documents に isActive:false（＝承認待ち下書き）で投入
 *      → 承認待ちは管理画面サイドバー「RAG Documents」バッジで可視化（メール通知は廃止）
 *
 * 🚨 生成物は必ず isActive:false。公開（本番反映）は人が /admin/rag で承認する。
 *    下書きは searchRAG 側で本番検索から除外される（isActive !== false）。
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
exports.generateRagDrafts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const db_1 = require("../db");
const config_1 = require("../config");
const ai_1 = require("../utils/ai");
const LOOKBACK_DAYS = 7;
const MAX_CLUSTERS = 5; // 1回の実行で作る下書きの上限
const MAX_SAMPLES_PER_CLUSTER = 8;
const SIMILARITY_THRESHOLD = 0.5;
exports.generateRagDrafts = (0, scheduler_1.onSchedule)({
    schedule: "0 0 * * 1", // 毎週月曜 00:00 UTC = JST 09:00
    timeZone: "UTC",
    region: config_1.REGION,
    timeoutSeconds: 540,
    memory: "512MiB",
}, async () => {
    const now = admin.firestore.Timestamp.now();
    const since = admin.firestore.Timestamp.fromMillis(now.toMillis() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    // 1. 直近の knowledge_gap を収集（composite index: failureBucket + createdAt）
    const snap = await db_1.chatDb
        .collection("chat_agent_logs")
        .where("failureBucket", "==", "knowledge_gap")
        .where("createdAt", ">=", since)
        .get();
    const questions = snap.docs
        .map((d) => (d.data().question ?? "").trim())
        .filter((q) => q.length >= 3);
    if (questions.length === 0) {
        console.log("generateRagDrafts: 対象の knowledge_gap なし");
        return;
    }
    // 2. 簡易クラスタリング（頻出＝大きいクラスタ優先）→ 上限まで
    const clusters = clusterQuestions(questions).slice(0, MAX_CLUSTERS);
    // 3. クラスタごとに下書き生成 → isActive:false で投入
    const created = [];
    for (const cluster of clusters) {
        const samples = cluster.slice(0, MAX_SAMPLES_PER_CLUSTER);
        const draft = await (0, ai_1.generateRagDraft)(samples);
        if (!draft)
            continue;
        await db_1.chatDb.collection("chat_rag_documents").add({
            title: draft.title,
            category: draft.category || "general",
            content: draft.content,
            isActive: false, // 承認待ち下書き（本番検索・公開は人の承認後）
            source: "auto_draft",
            sampleQuestions: samples,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        created.push({
            title: draft.title,
            count: cluster.length,
            sample: samples[0],
        });
    }
    if (created.length === 0) {
        console.log("generateRagDrafts: 下書きは作成されませんでした");
        return;
    }
    // 4. 承認待ちの可視化は管理画面サイドバー「RAG Documents」のバッジで行う
    //    （メール通知は廃止＝Gmailのドメイン委任が無く送信不可のため。バッジで代替）。
    console.log(`generateRagDrafts: 下書き ${created.length} 件を作成（/admin/rag の承認待ちに表示）`);
});
/**
 * 単語 Jaccard 類似度による貪欲クラスタリング（ベストエフォート）
 * ※ CJK は空白分かち書きされないため単文＝1トークン寄りになり、
 *   多くは単独クラスタになる。上限 MAX_CLUSTERS で件数を抑制する。
 */
function clusterQuestions(questions) {
    const tokens = questions.map(tokenize);
    const used = new Array(questions.length).fill(false);
    const clusters = [];
    for (let i = 0; i < questions.length; i++) {
        if (used[i])
            continue;
        used[i] = true;
        const cluster = [questions[i]];
        for (let j = i + 1; j < questions.length; j++) {
            if (used[j])
                continue;
            if (jaccard(tokens[i], tokens[j]) >= SIMILARITY_THRESHOLD) {
                used[j] = true;
                cluster.push(questions[j]);
            }
        }
        clusters.push(cluster);
    }
    return clusters.sort((a, b) => b.length - a.length);
}
function tokenize(s) {
    return new Set(s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 2));
}
function jaccard(a, b) {
    if (a.size === 0 || b.size === 0)
        return 0;
    let inter = 0;
    for (const x of a)
        if (b.has(x))
            inter++;
    return inter / (a.size + b.size - inter);
}
//# sourceMappingURL=generateRagDrafts.js.map