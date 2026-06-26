/**
 * Chat Simulation v3 — Context-Aware with Decision Tree Flow
 *
 * Key improvements:
 * 1. flowContext is passed to RAG search (same as production buildContextualQuery)
 * 2. Scenarios simulate users who went through the decision tree first
 * 3. RAG search query = contextKeywords + userMessage (boosted relevance)
 * 4. 30 diverse scenarios covering all categories and edge cases
 */

import "dotenv/config";
import { createPool } from "mysql2/promise";
import { writeFileSync } from "fs";

// ── Load env ──────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
if (!OPENAI_API_KEY) { console.error("OPENAI_API_KEY not set"); process.exit(1); }

// ── DB setup ──────────────────────────────────────────────────────────────────
const pool = createPool(DATABASE_URL);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function cosineSimilarity(a, b) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/** Build contextual query (same logic as server/routers/ai.ts buildContextualQuery) */
function buildContextualQuery(userMessage, flowContext) {
  if (!flowContext) return userMessage;
  const parts = [];
  if (flowContext.category) parts.push(flowContext.category);
  if (flowContext.device) parts.push(flowContext.device);
  if (flowContext.stage) parts.push(flowContext.stage);
  if (flowContext.issue) parts.push(flowContext.issue);
  return parts.length > 0 ? `${parts.join(" ")} ${userMessage}` : userMessage;
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

/** Hybrid RAG search: embedding + N-gram keyword matching (same as production ai.ts) */
async function searchRag(query, flowContext, topK = 7) {
  const contextualQuery = buildContextualQuery(query, flowContext);
  const docs = await listRagDocs();
  if (docs.length === 0) return { context: "", topScore: 0 };
  const qEmb = await getEmbedding(contextualQuery);

  // Generate N-grams (2-6 chars) for CJK-friendly matching
  const queryLower = contextualQuery.toLowerCase();
  const ngrams = new Set();
  const spaceTokens = queryLower.split(/[\s,\u3001\u3002\uff01\uff1f!?.\-\/]+/).filter(t => t.length >= 2);
  for (const token of spaceTokens) {
    ngrams.add(token);
    for (let len = 2; len <= Math.min(6, token.length); len++) {
      for (let i = 0; i <= token.length - len; i++) {
        ngrams.add(token.substring(i, i + len));
      }
    }
  }
  for (let len = 2; len <= Math.min(6, queryLower.length); len++) {
    for (let i = 0; i <= queryLower.length - len; i++) {
      const gram = queryLower.substring(i, i + len);
      if (!/^[\s,\u3001\u3002\uff01\uff1f!?.\-\/]+$/.test(gram)) {
        ngrams.add(gram);
      }
    }
  }
  const ngramArr = Array.from(ngrams);

  const scored = docs
    .filter(d => d.embedding.length > 0)
    .map(d => {
      const embScore = qEmb.length > 0 ? cosineSimilarity(qEmb, d.embedding) : 0;

      // N-gram keyword matching
      const titleLower = (d.title || "").toLowerCase();
      const contentLower = (d.content || "").toLowerCase();
      let titleHits = 0;
      let contentHits = 0;
      for (const gram of ngramArr) {
        if (titleLower.includes(gram)) titleHits++;
        else if (contentLower.includes(gram)) contentHits++;
      }
      const totalHitScore = titleHits * 2 + contentHits;
      const maxScore = ngramArr.length * 2;
      const keywordScore = maxScore > 0 ? Math.min(totalHitScore / maxScore, 1.0) : 0;

      const hybridScore = embScore * 0.5 + keywordScore * 0.5;
      return { doc: d, score: hybridScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const topScore = scored[0]?.score ?? 0;
  const context = scored.map(s => `[${s.doc.title}]\n${s.doc.content}`).join("\n\n");
  return { context, topScore };
}

/** Call LLM via Forge API */
async function invokeLLM(messages, model = "gpt-4o-mini") {
  const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${FORGE_API_KEY}` },
    body: JSON.stringify({ model, messages, max_tokens: 800 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

/** Build flow context prompt (same logic as server) */
function buildFlowContextPrompt(flowContext) {
  const lines = ["\n## User Context (from Decision Tree)"];
  lines.push("The user navigated through the decision tree and selected:");
  if (flowContext.category) lines.push(`- Category: ${flowContext.category}`);
  if (flowContext.device) lines.push(`- Device: ${flowContext.device}`);
  if (flowContext.stage) lines.push(`- Stage: ${flowContext.stage}`);
  if (flowContext.issue) lines.push(`- Issue: ${flowContext.issue}`);
  lines.push("");
  lines.push("Use this context to provide highly targeted troubleshooting steps.");
  
  if (flowContext.category === "connection") {
    if (flowContext.device === "iPhone") {
      if (flowContext.stage === "post_install") {
        lines.push("\n## iPhone Post-Install Troubleshooting");
        lines.push("1. Settings > Cellular > check yah.mobile eSIM line is ON");
        lines.push("2. Settings > Cellular > yah.mobile > Turn on Data Roaming");
        lines.push("3. Settings > Cellular > yah.mobile > Cellular Data Network > APN: yah.mobile");
        lines.push("4. Set yah.mobile as Primary for Cellular Data");
        lines.push("5. Toggle Airplane Mode ON then OFF");
        lines.push("6. Settings > General > About > check for Carrier Settings Update");
        lines.push("7. Restart device");
        lines.push("8. Reset Network Settings as last resort");
      } else {
        lines.push("\n## iPhone Pre-Install Troubleshooting");
        lines.push("1. Confirm iPhone XS or later with iOS 14+");
        lines.push("2. Check 'Available SIM' or 'EID' in Settings > General > About");
        lines.push("3. Ensure stable Wi-Fi for QR code scanning");
        lines.push("4. Settings > Cellular > Add eSIM > Use QR Code");
        lines.push("5. If QR fails: try manual entry with SM-DP+ address");
        lines.push("6. If 'eSIM not supported': device must be carrier-unlocked");
      }
    } else if (flowContext.device === "Android") {
      if (flowContext.stage === "post_install") {
        lines.push("\n## Android Post-Install Troubleshooting");
        lines.push("1. Settings > Network & Internet > SIMs > enable yah.mobile");
        lines.push("2. Enable Data Roaming for yah.mobile SIM");
        lines.push("3. Access Point Names > Add: Name=yah.mobile, APN=yah.mobile");
        lines.push("4. Set yah.mobile as default for Mobile Data");
        lines.push("5. Toggle Airplane Mode ON then OFF");
        lines.push("6. Restart device");
        lines.push("7. Reset Wi-Fi, mobile & Bluetooth as last resort");
      } else {
        lines.push("\n## Android Pre-Install Troubleshooting");
        lines.push("1. Confirm device supports eSIM (Pixel 3+, Galaxy S20+, etc.)");
        lines.push("2. Settings > Network & Internet > SIMs > Add eSIM");
        lines.push("3. Scan QR code or enter activation code");
        lines.push("4. If unavailable: check device is carrier-unlocked");
      }
    }
  } else if (flowContext.category === "pricing") {
    lines.push("\n## Pricing & Plans \u2014 Complete Reference");
    lines.push("");
    lines.push("### Available Plans (all tax-included, Japan-only data)");
    lines.push("| Plan | Data | Duration | Price | Best For |");
    lines.push("|------|------|----------|-------|----------|");
    lines.push("| Light | 3GB | 7 days | \u00a51,078 | Short trips (3-5 days), light usage |");
    lines.push("| Standard | 5GB | 15 days | \u00a51,848 | 1-2 week trips, moderate usage |");
    lines.push("| Value | 10GB | 30 days | \u00a53,278 | 2-4 week trips, regular usage |");
    lines.push("| Premium | 20GB | 30 days | \u00a55,478 | Heavy usage (streaming, remote work) |");
    lines.push("| Ultra | 50GB | 30 days | \u00a511,000 | Power users, multiple devices via hotspot |");
    lines.push("| Unlimited | Unlimited | 30 days | \u00a516,500 | No data worries, business travelers |");
    lines.push("");
    lines.push("### Additional Data Purchase");
    lines.push("- Price: 1GB = \u00a5550 (tax included)");
    lines.push("- How to buy: My Page or yah.mobile app > 'Add Data' button");
    lines.push("- Validity: Same as remaining plan period");
    lines.push("");
    lines.push("### Payment Methods");
    lines.push("- Credit cards: Visa, Mastercard, American Express (AMEX), JCB");
    lines.push("- Mobile payments: Apple Pay, Google Pay");
    lines.push("- NOT supported: PayPal, bank transfer, convenience store payment");
    lines.push("");
    lines.push("### Recommendation Logic");
    lines.push("- 1-7 days + light use \u2192 Light (\u00a51,078)");
    lines.push("- 1-2 weeks + moderate \u2192 Standard (\u00a51,848)");
    lines.push("- 2+ weeks + regular \u2192 Value (\u00a53,278)");
    lines.push("- Heavy streaming/work \u2192 Premium (\u00a55,478) or Ultra (\u00a511,000)");
    lines.push("- Business/no worries \u2192 Unlimited (\u00a516,500)");
    lines.push("- If unsure: recommend Standard as best value");
  } else if (flowContext.category === "refund") {
    lines.push("\n## Refund & Cancellation \u2014 Complete Policy");
    lines.push("");
    lines.push("### Core Policy");
    lines.push("- eSIM is a DIGITAL PRODUCT");
    lines.push("- Once payment is complete, refunds and cancellations are NOT available");
    lines.push("- Legal basis: Japan's Act on Specified Commercial Transactions Article 15-3");
    lines.push("- Customer consented to this policy via checkbox during purchase");
    lines.push("");
    lines.push("### Exceptions (ONLY these 3 cases)");
    lines.push("1. System failure: eSIM not issued (QR code never delivered)");
    lines.push("2. Duplicate charge: Same amount charged twice");
    lines.push("3. Unauthorized use: Credit card fraud");
    lines.push("");
    lines.push("### Response Flow");
    lines.push("1. Acknowledge frustration empathetically");
    lines.push("2. Explain no-refund policy with legal basis");
    lines.push("3. Ask if situation matches an exception");
    lines.push("4. If exception: guide to contact form at yah.mobi/app");
    lines.push("5. If not: explain clearly but kindly that refund cannot be processed");
    lines.push("");
    lines.push("### Common Scenarios");
    lines.push("- 'Haven't used it' \u2192 No refund (digital product delivered = QR sent)");
    lines.push("- 'Bought wrong plan' \u2192 No refund, can buy additional data");
    lines.push("- 'Doesn't work' \u2192 Troubleshoot first; if system failure, guide to form");
    lines.push("- 'Charged twice' \u2192 Exception; guide to contact form");
    lines.push("- 'Didn't receive QR' \u2192 Check spam; if truly not received, exception");
  }
  return lines.join("\n");
}

/** Generate AI response with flow context */
async function generateAIResponse(userMessage, history, language, flowContext) {
  const LANG_NAMES = { ja: "Japanese", en: "English", zh: "Chinese", ko: "Korean", th: "Thai", vi: "Vietnamese" };
  const langName = LANG_NAMES[language] ?? "English";
  
  const { context: ragContext, topScore } = await searchRag(userMessage, flowContext);
  const flowContextSection = flowContext ? buildFlowContextPrompt(flowContext) : "";

  const systemPrompt = `You are a helpful customer support assistant for yah.mobile, a Japan-only eSIM service for international travelers.
Always respond in ${langName}.

## About yah.mobile
- Japan-only eSIM service for international travelers visiting Japan
- Industry-lowest price per GB
- 24/7 support in 6 languages
- Plans: Light 3GB/7d ¥1,078, Standard 5GB/15d ¥1,848, Value 10GB/30d ¥3,278, Premium 20GB/30d ¥5,478, Ultra 50GB/30d ¥11,000, Unlimited/30d ¥16,500
- Payment: Visa/Mastercard/AMEX/JCB, Apple Pay, Google Pay

## Response Style
- Be concise, polite, and professional
- For eSIM setup: explain step-by-step with specific menu paths
- When user says "still not working": provide the NEXT step, don't repeat
- Never say "I'll connect you to a human" — answer directly or guide to contact form
${flowContextSection}
${ragContext ? `\n## Knowledge Base\n${ragContext}` : ""}`;

  const msgs = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role === "visitor" ? "user" : "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  const content = await invokeLLM(msgs);
  const aiCount = history.filter(m => m.role === "ai").length;
  const shouldRedirectToForm = aiCount >= 10;

  return { content, shouldRedirectToForm, ragTopScore: topScore };
}

// ── Test Scenarios (30 sessions with flowContext) ─────────────────────────────
const SCENARIOS = [
  // === CONNECTION - iPhone Post-Install (highest priority) ===
  {
    id: "sim-001", name: "【JA】iPhone接続トラブル（ツリー経由）", language: "ja",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "eSIMをインストールしたのですが、インターネットに繋がりません",
      "設定を確認しましたが、まだ繋がりません",
      "データローミングもオンにしました。それでも繋がらないです",
    ],
  },
  {
    id: "sim-002", name: "【EN】iPhone not connecting (tree)", language: "en",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "I installed the eSIM but I can't connect to the internet",
      "I checked the settings, still not working",
      "Data roaming is on, airplane mode toggled, still nothing",
    ],
  },
  {
    id: "sim-003", name: "【KO】iPhone 연결 안됨 (트리)", language: "ko",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "eSIM을 설치했는데 인터넷이 안 됩니다",
      "설정을 확인했는데 여전히 안 됩니다",
    ],
  },
  {
    id: "sim-004", name: "【ZH】iPhone连接失败 (树)", language: "zh",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "我安装了eSIM但是无法连接网络",
      "我检查了设置，还是连不上",
    ],
  },
  {
    id: "sim-005", name: "【TH】iPhone เชื่อมต่อไม่ได้ (ทรี)", language: "th",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "ติดตั้ง eSIM แล้วแต่เชื่อมต่ออินเทอร์เน็ตไม่ได้",
      "ตรวจสอบการตั้งค่าแล้ว ยังไม่ได้อยู่ดี",
    ],
  },
  {
    id: "sim-006", name: "【VI】iPhone không kết nối (cây)", language: "vi",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
    turns: [
      "Tôi đã cài đặt eSIM nhưng không kết nối được internet",
      "Tôi đã kiểm tra cài đặt, vẫn không được",
    ],
  },
  // === CONNECTION - Android Post-Install ===
  {
    id: "sim-007", name: "【JA】Android接続トラブル（ツリー経由）", language: "ja",
    flowContext: { category: "connection", device: "Android", stage: "post_install" },
    turns: [
      "AndroidにeSIMをインストールしましたが、ネットに繋がりません",
      "APN設定もしましたが、まだダメです",
      "機内モードのオンオフもしました",
    ],
  },
  {
    id: "sim-008", name: "【EN】Android not connecting (tree)", language: "en",
    flowContext: { category: "connection", device: "Android", stage: "post_install" },
    turns: [
      "My Android phone has the eSIM installed but no data connection",
      "I set the APN to yah.mobile but still no luck",
      "Tried airplane mode toggle and restart, nothing works",
    ],
  },
  // === CONNECTION - iPhone Pre-Install ===
  {
    id: "sim-009", name: "【JA】iPhoneインストールできない（ツリー経由）", language: "ja",
    flowContext: { category: "connection", device: "iPhone", stage: "pre_install" },
    turns: [
      "QRコードを読み取ったのですが、eSIMが追加されません",
      "iPhone 14 Proを使っています。SIMロックは解除済みです",
    ],
  },
  {
    id: "sim-010", name: "【EN】iPhone can't install (tree)", language: "en",
    flowContext: { category: "connection", device: "iPhone", stage: "pre_install" },
    turns: [
      "I scanned the QR code but the eSIM won't install",
      "My phone says 'eSIM not supported' but it's an iPhone 13",
    ],
  },
  // === CONNECTION - Android Pre-Install ===
  {
    id: "sim-011", name: "【EN】Android can't install (tree)", language: "en",
    flowContext: { category: "connection", device: "Android", stage: "pre_install" },
    turns: [
      "I can't find the option to add eSIM on my Samsung Galaxy S22",
      "I went to Network settings but there's no eSIM option",
    ],
  },
  // === PRICING - All languages ===
  {
    id: "sim-012", name: "【JA】料金プラン問い合わせ（ツリー経由）", language: "ja",
    flowContext: { category: "pricing" },
    turns: [
      "料金プランを教えてください",
      "1週間の旅行でおすすめのプランはどれですか？",
      "追加データは購入できますか？",
    ],
  },
  {
    id: "sim-013", name: "【EN】Pricing inquiry (tree)", language: "en",
    flowContext: { category: "pricing" },
    turns: [
      "What plans do you offer?",
      "I'm visiting Japan for 2 weeks, which plan do you recommend?",
      "Can I add more data if I run out?",
    ],
  },
  {
    id: "sim-014", name: "【KO】요금 문의 (트리)", language: "ko",
    flowContext: { category: "pricing" },
    turns: [
      "요금제는 어떻게 되나요?",
      "가장 저렴한 플랜을 알려주세요",
      "데이터를 추가로 구매할 수 있나요?",
    ],
  },
  {
    id: "sim-015", name: "【ZH】价格咨询 (树)", language: "zh",
    flowContext: { category: "pricing" },
    turns: [
      "你们有什么套餐？",
      "我要去日本两周，推荐哪个套餐？",
    ],
  },
  {
    id: "sim-016", name: "【TH】สอบถามราคา (ทรี)", language: "th",
    flowContext: { category: "pricing" },
    turns: [
      "มีแพ็กเกจอะไรบ้าง",
      "ไปญี่ปุ่น 7 วัน แนะนำแพ็กเกจไหน",
    ],
  },
  {
    id: "sim-017", name: "【VI】Hỏi giá (cây)", language: "vi",
    flowContext: { category: "pricing" },
    turns: [
      "Có những gói cước nào?",
      "Tôi đi Nhật 10 ngày, nên chọn gói nào?",
    ],
  },
  // === REFUND - All languages ===
  {
    id: "sim-018", name: "【JA】返金リクエスト（ツリー経由）", language: "ja",
    flowContext: { category: "refund" },
    turns: [
      "購入したeSIMが使えないので返金してほしいです",
      "でも一度も使えていないのに返金できないのはおかしいと思います",
      "消費者センターに相談します",
    ],
  },
  {
    id: "sim-019", name: "【EN】Refund request (tree)", language: "en",
    flowContext: { category: "refund" },
    turns: [
      "I want to cancel my order and get a refund",
      "But I haven't used it yet, can't you make an exception?",
      "This is unacceptable, I'll dispute the charge with my bank",
    ],
  },
  {
    id: "sim-020", name: "【KO】환불 요청 (트리)", language: "ko",
    flowContext: { category: "refund" },
    turns: [
      "환불을 원합니다",
      "한 번도 사용하지 않았는데 환불이 안 된다니요?",
    ],
  },
  {
    id: "sim-021", name: "【ZH】退款请求 (树)", language: "zh",
    flowContext: { category: "refund" },
    turns: [
      "我想退款",
      "我还没用过，为什么不能退？",
    ],
  },
  {
    id: "sim-022", name: "【TH】ขอคืนเงิน (ทรี)", language: "th",
    flowContext: { category: "refund" },
    turns: [
      "ขอคืนเงินได้ไหม",
      "ยังไม่ได้ใช้เลย ทำไมคืนเงินไม่ได้",
    ],
  },
  {
    id: "sim-023", name: "【VI】Yêu cầu hoàn tiền (cây)", language: "vi",
    flowContext: { category: "refund" },
    turns: [
      "Tôi muốn được hoàn tiền",
      "Tôi chưa sử dụng, tại sao không thể hoàn tiền?",
    ],
  },
  // === NO CONTEXT (Other / Free chat) ===
  {
    id: "sim-024", name: "【EN】General inquiry (no tree)", language: "en",
    flowContext: null,
    turns: [
      "What is yah.mobile?",
      "Does it work in Japan only?",
      "How long does the eSIM last?",
    ],
  },
  {
    id: "sim-025", name: "【JA】一般問い合わせ（ツリーなし）", language: "ja",
    flowContext: null,
    turns: [
      "yah.mobileとは何ですか？",
      "対応している端末を教えてください",
    ],
  },
  // === EDGE CASES ===
  {
    id: "sim-026", name: "【JA】フォーム誘導テスト（10回以上）", language: "ja",
    flowContext: { category: "connection", device: "iPhone", stage: "post_install" },
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
    id: "sim-027", name: "【EN】Duplicate charge exception", language: "en",
    flowContext: { category: "refund" },
    turns: [
      "I was charged twice for the same eSIM purchase",
      "Yes I can see two identical charges on my credit card statement",
    ],
  },
  {
    id: "sim-028", name: "【JA】eSIM未発行例外", language: "ja",
    flowContext: { category: "refund" },
    turns: [
      "支払いは完了したのですが、QRコードが届きません",
      "メールも迷惑メールフォルダも確認しましたが、どこにもありません",
    ],
  },
  {
    id: "sim-029", name: "【EN】Payment method question (tree)", language: "en",
    flowContext: { category: "pricing" },
    turns: [
      "What payment methods do you accept?",
      "Can I pay with PayPal?",
    ],
  },
  {
    id: "sim-030", name: "【JA】データ追加購入（ツリー経由）", language: "ja",
    flowContext: { category: "pricing" },
    turns: [
      "データ容量を使い切ってしまいました。追加できますか？",
      "追加データの料金を教えてください",
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
const results = [];

console.log("=".repeat(60));
console.log("  yah.mobile Chat Simulation v3 — Context-Aware");
console.log(`  ${SCENARIOS.length} Test Sessions`);
console.log("=".repeat(60));
console.log();

for (const scenario of SCENARIOS) {
  console.log(`▶ ${scenario.name} (${scenario.id})`);
  const sessionResult = {
    id: scenario.id,
    name: scenario.name,
    language: scenario.language,
    flowContext: scenario.flowContext,
    turns: [],
    errors: [],
    formRedirectTriggered: false,
    ragHitScores: [],
  };

  const history = [];

  for (let i = 0; i < scenario.turns.length; i++) {
    const userMsg = scenario.turns[i];

    try {
      const { content, shouldRedirectToForm, ragTopScore } = await generateAIResponse(
        userMsg, history, scenario.language, scenario.flowContext
      );

      if (shouldRedirectToForm) sessionResult.formRedirectTriggered = true;

      history.push({ role: "visitor", content: userMsg });
      history.push({ role: "ai", content });

      sessionResult.turns.push({
        turn: i + 1,
        userMessage: userMsg,
        aiResponse: content.substring(0, 150) + (content.length > 150 ? "…" : ""),
        shouldRedirectToForm,
        ragTopScore: Math.round(ragTopScore * 1000) / 1000,
      });
      sessionResult.ragHitScores.push(ragTopScore);

      const icon = shouldRedirectToForm ? "🔴" : ragTopScore >= 0.8 ? "🟢" : ragTopScore >= 0.5 ? "🟡" : "🔶";
      console.log(`  T${i + 1} ${icon} RAG:${ragTopScore.toFixed(3)} | ${content.substring(0, 60)}…`);
    } catch (err) {
      sessionResult.errors.push({ turn: i + 1, error: err.message });
      console.error(`  T${i + 1} ❌ ERROR: ${err.message}`);
    }
  }

  results.push(sessionResult);
  console.log();
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log("=".repeat(60));
console.log("  RESULTS SUMMARY");
console.log("=".repeat(60));

// Category-based analysis
const categories = { connection: [], pricing: [], refund: [], general: [] };
for (const r of results) {
  const cat = r.flowContext?.category ?? "general";
  categories[cat] = categories[cat] || [];
  categories[cat].push(r);
}

let totalTurns = 0;
let totalErrors = 0;
let formRedirects = 0;
let allScores = [];

for (const r of results) {
  totalTurns += r.turns.length;
  totalErrors += r.errors.length;
  if (r.formRedirectTriggered) formRedirects++;
  for (const t of r.turns) {
    allScores.push(t.ragTopScore);
  }
}

console.log("\n  📊 Category Breakdown:");
for (const [cat, sessions] of Object.entries(categories)) {
  const scores = sessions.flatMap(s => s.ragHitScores);
  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const min = scores.length > 0 ? Math.min(...scores) : 0;
  const max = scores.length > 0 ? Math.max(...scores) : 0;
  const target = cat === "connection" ? 0.8 : cat === "pricing" ? 0.9 : cat === "refund" ? 0.9 : 0.4;
  const status = avg >= target ? "✅ TARGET MET" : "❌ BELOW TARGET";
  console.log(`  ${cat.toUpperCase().padEnd(12)} | Avg: ${avg.toFixed(3)} | Min: ${min.toFixed(3)} | Max: ${max.toFixed(3)} | ${status} (target: ${target})`);
}

const overallAvg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

console.log(`\n  Sessions:        ${results.length}`);
console.log(`  Total turns:     ${totalTurns}`);
console.log(`  Errors:          ${totalErrors}`);
console.log(`  Form redirects:  ${formRedirects} / ${results.length}`);
console.log(`  Overall Avg RAG: ${overallAvg.toFixed(3)}`);
console.log();

// Save results
const outputPath = "/home/ubuntu/yah-chat-webdev/scripts/simulation_results_v3.json";
writeFileSync(outputPath, JSON.stringify({ summary: { categories, overallAvg, totalSessions: results.length, totalTurns, totalErrors, formRedirects }, sessions: results }, null, 2));
console.log(`  Results saved to: ${outputPath}`);

// Save to DB
try {
  await pool.query(
    `INSERT INTO simulation_run_results
     (totalSessions, totalTurns, totalErrors, formRedirects, avgRagScore, sessionResults, ranAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [results.length, totalTurns, totalErrors, formRedirects, parseFloat(overallAvg.toFixed(4)), JSON.stringify(results)]
  );
  console.log("  ✅ Results saved to DB");
} catch (err) {
  console.error("  ❌ DB save failed:", err.message);
}

console.log("=".repeat(60));
await pool.end();
