/**
 * Chat Simulation Script — 10 test sessions
 *
 * Directly calls AI logic functions (generateAIResponse, detectLanguageFromMessage,
 * generateSummary, searchRagDocuments) to simulate real chat sessions.
 *
 * Test sessions are tagged with visitorId: "test-bot-NNN" for easy cleanup.
 * Run cleanup after: node scripts/cleanup_test_sessions.mjs
 */

import "dotenv/config";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

// ── Load env ──────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!OPENAI_API_KEY) { console.error("OPENAI_API_KEY not set"); process.exit(1); }

// ── DB setup ──────────────────────────────────────────────────────────────────
const pool = createPool(DATABASE_URL);
const db = drizzle(pool);

// ── Helpers (inline, no TS imports) ──────────────────────────────────────────

/** Get embedding via OpenAI */
async function getEmbedding(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.substring(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

/** Cosine similarity */
function cosineSimilarity(a, b) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Detect language */
function detectLanguage(msg) {
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(msg)) return "ja";
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(msg)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(msg) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(msg)) return "zh";
  if (/[\u0E00-\u0E7F]/.test(msg)) return "th";
  if (/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(msg)) return "vi";
  if (/^[\x00-\x7F]+$/.test(msg.trim())) return "en";
  return "en";
}

/** Fetch active RAG docs from DB */
async function listRagDocs() {
  const [rows] = await pool.query(
    "SELECT id, title, content, embedding FROM rag_documents WHERE (expiresAt IS NULL OR expiresAt > NOW())"
  );
  return rows.map(r => ({
    ...r,
    embedding: Array.isArray(r.embedding)
      ? r.embedding
      : (r.embedding
          ? (typeof r.embedding === 'string'
              ? JSON.parse(r.embedding)
              : (Buffer.isBuffer(r.embedding)
                  ? JSON.parse(r.embedding.toString())
                  : []))
          : []),
  }));
}

/** Search RAG docs by cosine similarity */
async function searchRag(query, topK = 3) {
  const docs = await listRagDocs();
  if (docs.length === 0) return "";
  const qEmb = await getEmbedding(query);
  const scored = docs
    .filter(d => d.embedding.length > 0)
    .map(d => ({ doc: d, score: cosineSimilarity(qEmb, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored.map(s => `[${s.doc.title}]\n${s.doc.content}`).join("\n\n");
}

/** Call LLM via Forge API */
async function invokeLLM(messages, model = "gpt-4o") {
  const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_API_KEY}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

/** Generate AI response */
async function generateAIResponse(userMessage, history, language) {
  const LANG_NAMES = { ja: "Japanese", en: "English", zh: "Chinese", ko: "Korean", th: "Thai", vi: "Vietnamese" };
  const UNRESOLVED = {
    ja: ["解決しない", "わからない", "できない", "うまくいかない", "また", "もう一度", "同じ", "繋がらない", "表示されない", "インストールできない", "使えない", "開かない", "エラー", "失敗", "困って", "困った", "助けて"],
    en: ["still", "not working", "doesn't work", "can't", "cannot", "again", "same issue", "same problem", "not resolved", "not connecting", "not showing", "failed", "error", "help me", "stuck"],
    zh: ["还是", "仍然", "不行", "不能", "再次", "同样", "连不上", "显示不了", "安装失败", "错误"],
    ko: ["여전히", "안돼", "안되", "또", "같은", "해결안", "연결안", "표시안", "설치안", "오류"],
    th: ["ยังไม่", "ไม่ได้", "อีกครั้ง", "ยังคง", "เชื่อมต่อไม่ได้", "ไม่แสดง", "ติดตั้งไม่ได้", "ข้อผิดพลาด"],
    vi: ["vẫn", "không được", "lại", "cùng vấn đề", "không kết nối", "không hiển thị", "lỗi", "cài đặt thất bại"],
  };

  const aiCount = history.filter(m => m.role === "ai").length;
  const langName = LANG_NAMES[language] ?? "English";
  const ragContext = await searchRag(userMessage);

  const systemPrompt = `You are a helpful customer support assistant for yah.mobile, a Japan-only eSIM service for international travelers.
Always respond in ${langName}.

## About yah.mobile
- Japan-only eSIM service for international travelers
- Industry-lowest price per GB
- 24/7 support in 6 languages

## Response Style
- Be concise, polite, and professional
- For eSIM setup questions, explain step-by-step
- Never say "I'll connect you to a human operator" — always answer directly or guide to the contact form
- For refund requests: Explain that refunds are NOT available once payment is complete (Japan's Act on Specified Commercial Transactions Article 15-3).
${ragContext ? `\n## Knowledge Base\n${ragContext}` : ""}`;

  const msgs = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role === "visitor" ? "user" : "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  const content = await invokeLLM(msgs);
  const unresolvedKws = UNRESOLVED[language] ?? UNRESOLVED["en"];
  const userSignalsUnresolved = unresolvedKws.some(kw => userMessage.toLowerCase().includes(kw));
  const shouldRedirectToForm = aiCount >= 10 || (aiCount >= 5 && userSignalsUnresolved);

  return { content, shouldRedirectToForm };
}

/** Generate summary */
async function generateSummary(history) {
  if (history.length === 0) return "";
  const conv = history.map(m => `${m.role === "visitor" ? "Visitor" : "AI"}: ${m.content}`).join("\n");
  return invokeLLM([
    { role: "system", content: "Summarize the following customer support conversation in 2-3 sentences in Japanese. Focus on the main issue and resolution." },
    { role: "user", content: conv },
  ]);
}

// ── Test Scenarios ────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "test-bot-001",
    name: "【日本語】eSIM接続トラブル",
    language: "ja",
    turns: [
      "eSIMをインストールしたのですが、インターネットに繋がりません",
      "設定を確認しましたが、まだ繋がりません",
      "データローミングもオンにしました。それでも繋がらないです",
    ],
  },
  {
    id: "test-bot-002",
    name: "【日本語】返金リクエスト",
    language: "ja",
    turns: [
      "購入したeSIMが使えないので返金してほしいです",
      "でも一度も使えていないのに返金できないのはおかしいと思います",
    ],
  },
  {
    id: "test-bot-003",
    name: "【英語】eSIM installation steps",
    language: "en",
    turns: [
      "How do I install the eSIM on my iPhone?",
      "I followed the steps but it's not showing in my settings",
    ],
  },
  {
    id: "test-bot-004",
    name: "【英語】Refund policy inquiry",
    language: "en",
    turns: [
      "I want to cancel my order and get a refund",
      "But I haven't used it yet, can't you make an exception?",
    ],
  },
  {
    id: "test-bot-005",
    name: "【韓国語】요금 문의",
    language: "ko",
    turns: [
      "요금제는 어떻게 되나요?",
      "가장 저렴한 플랜을 알려주세요",
    ],
  },
  {
    id: "test-bot-006",
    name: "【中国語】安装问题",
    language: "zh",
    turns: [
      "我的eSIM安装不上，怎么办？",
      "我按照步骤操作了，但还是显示不了",
    ],
  },
  {
    id: "test-bot-007",
    name: "【タイ語】การติดตั้ง eSIM",
    language: "th",
    turns: [
      "วิธีติดตั้ง eSIM บน iPhone ทำอย่างไร",
      "ติดตั้งแล้วแต่ยังไม่แสดงในการตั้งค่า",
    ],
  },
  {
    id: "test-bot-008",
    name: "【ベトナム語】Cài đặt eSIM",
    language: "vi",
    turns: [
      "Làm thế nào để cài đặt eSIM trên iPhone?",
      "Tôi đã làm theo hướng dẫn nhưng vẫn không kết nối được",
    ],
  },
  {
    id: "test-bot-009",
    name: "【日本語】フォーム誘導テスト（10回以上）",
    language: "ja",
    turns: [
      "eSIMが繋がりません",
      "まだ繋がりません",
      "設定を確認しましたが繋がりません",
      "データローミングもオンにしました",
      "それでも繋がりません",
      "APN設定もしました",
      "まだダメです",
      "キャリア設定も更新しました",
      "繋がらないです",
      "どうしたらいいですか",
      "まだ解決しません",
    ],
  },
  {
    id: "test-bot-010",
    name: "【英語】General product inquiry",
    language: "en",
    turns: [
      "What is yah.mobile?",
      "Does it work in Japan?",
      "How long does the eSIM last?",
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
const results = [];

console.log("=".repeat(60));
console.log("  yah.mobile Chat Simulation — 10 Test Sessions");
console.log("=".repeat(60));
console.log();

for (const scenario of SCENARIOS) {
  console.log(`▶ ${scenario.name} (${scenario.id})`);
  const sessionResult = {
    id: scenario.id,
    name: scenario.name,
    language: scenario.language,
    turns: [],
    summary: null,
    errors: [],
    formRedirectTriggered: false,
    ragHitScores: [],
  };

  const history = [];

  for (let i = 0; i < scenario.turns.length; i++) {
    const userMsg = scenario.turns[i];
    const detectedLang = detectLanguage(userMsg);

    try {
      // RAG search score
      const docs = await listRagDocs();
      let topRagScore = 0;
      if (docs.length > 0) {
        const qEmb = await getEmbedding(userMsg);
        const scored = docs
          .filter(d => d.embedding.length > 0)
          .map(d => ({ score: cosineSimilarity(qEmb, d.embedding) }))
          .sort((a, b) => b.score - a.score);
        topRagScore = scored[0]?.score ?? 0;
      }

      // AI response
      const { content, shouldRedirectToForm } = await generateAIResponse(userMsg, history, scenario.language);

      if (shouldRedirectToForm) sessionResult.formRedirectTriggered = true;

      history.push({ role: "visitor", content: userMsg });
      history.push({ role: "ai", content });

      sessionResult.turns.push({
        turn: i + 1,
        userMessage: userMsg,
        detectedLanguage: detectedLang,
        aiResponse: content.substring(0, 120) + (content.length > 120 ? "…" : ""),
        shouldRedirectToForm,
        ragTopScore: Math.round(topRagScore * 1000) / 1000,
      });

      const icon = shouldRedirectToForm ? "🔴" : "✅";
      console.log(`  Turn ${i + 1} ${icon} RAG:${topRagScore.toFixed(3)} | ${content.substring(0, 60)}…`);
    } catch (err) {
      sessionResult.errors.push({ turn: i + 1, error: err.message });
      console.error(`  Turn ${i + 1} ❌ ERROR: ${err.message}`);
    }
  }

  // Generate summary
  try {
    const summary = await generateSummary(history);
    sessionResult.summary = summary;
    console.log(`  📝 Summary: ${summary.substring(0, 80)}…`);
  } catch (err) {
    sessionResult.errors.push({ turn: "summary", error: err.message });
    console.error(`  📝 Summary ❌ ERROR: ${err.message}`);
  }

  results.push(sessionResult);
  console.log();
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("  RESULTS SUMMARY");
console.log("=".repeat(60));

let totalTurns = 0;
let totalErrors = 0;
let formRedirects = 0;
let avgRagScore = 0;
let ragScoreCount = 0;

for (const r of results) {
  const errCount = r.errors.length;
  const turnCount = r.turns.length;
  totalTurns += turnCount;
  totalErrors += errCount;
  if (r.formRedirectTriggered) formRedirects++;

  for (const t of r.turns) {
    avgRagScore += t.ragTopScore;
    ragScoreCount++;
  }

  const status = errCount === 0 ? "✅ PASS" : `❌ FAIL (${errCount} errors)`;
  const formFlag = r.formRedirectTriggered ? " 🔴 FORM" : "";
  console.log(`  ${status}${formFlag} | ${r.name}`);
}

const overallAvgRag = ragScoreCount > 0 ? (avgRagScore / ragScoreCount).toFixed(3) : "N/A";

console.log();
console.log(`  Sessions:        ${results.length}`);
console.log(`  Total turns:     ${totalTurns}`);
console.log(`  Errors:          ${totalErrors}`);
console.log(`  Form redirects:  ${formRedirects} / ${results.length}`);
console.log(`  Avg RAG score:   ${overallAvgRag}`);
console.log();

// Save results to JSON
import { writeFileSync } from "fs";
const outputPath = "/home/ubuntu/yah-chat-webdev/scripts/simulation_results.json";
writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`  Results saved to: ${outputPath}`);

// Save results to DB
try {
  await pool.query(
    `INSERT INTO simulation_run_results
     (totalSessions, totalTurns, totalErrors, formRedirects, avgRagScore, sessionResults, ranAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      results.length,
      totalTurns,
      totalErrors,
      formRedirects,
      ragScoreCount > 0 ? parseFloat((avgRagScore / ragScoreCount).toFixed(4)) : 0,
      JSON.stringify(results),
    ]
  );
  console.log("  ✅ Results saved to DB (simulation_run_results)");
} catch (err) {
  console.error("  ❌ Failed to save to DB:", err.message);
}

console.log();
console.log("  ⚠️  Run cleanup when done:");
console.log("  node scripts/cleanup_test_sessions.mjs");
console.log("=".repeat(60));

await pool.end();
