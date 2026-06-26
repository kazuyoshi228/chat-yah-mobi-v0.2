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

// Get text embedding via OpenAI API (Forge API does not support /v1/embeddings)
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    const response = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.substring(0, 8000), // Truncate to avoid token limit
        }),
      }
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API error: ${response.status} ${errText}`);
    }
    const data = (await response.json()) as any;
    return data.data[0].embedding as number[];
  } catch (e) {
    console.warn("[AI] Embedding failed, returning empty vector:", e);
    return [];
  }
}

// Build contextual query by combining user message with decision tree context
function buildContextualQuery(
  userMessage: string,
  flowContext?: { category?: string; device?: string; stage?: string; issue?: string }
): string {
  if (!flowContext) return userMessage;
  const parts: string[] = [];
  if (flowContext.category) parts.push(flowContext.category);
  if (flowContext.device) parts.push(flowContext.device);
  if (flowContext.stage) parts.push(flowContext.stage);
  if (flowContext.issue) parts.push(flowContext.issue);
  // Prepend context keywords to boost RAG relevance
  return parts.length > 0 ? `${parts.join(" ")} ${userMessage}` : userMessage;
}

// Build flow context prompt section for system prompt
function buildFlowContextPrompt(
  flowContext: { category?: string; device?: string; stage?: string; issue?: string },
  langName: string
): string {
  const lines: string[] = ["\n## User Context (from Decision Tree)"];
  lines.push("The user navigated through the decision tree and selected:");
  if (flowContext.category) lines.push(`- Category: ${flowContext.category}`);
  if (flowContext.device) lines.push(`- Device: ${flowContext.device}`);
  if (flowContext.stage) lines.push(`- Stage: ${flowContext.stage}`);
  if (flowContext.issue) lines.push(`- Issue: ${flowContext.issue}`);
  lines.push("");
  lines.push("Use this context to provide highly targeted troubleshooting steps.");
  lines.push("Do NOT ask the user to repeat information they already provided via the decision tree.");
  lines.push("Start with the NEXT logical step based on their selections.");
  
  // Add specific troubleshooting logic based on context
  if (flowContext.category === "connection" || flowContext.category === "接続") {
    if (flowContext.device === "iPhone" || flowContext.device === "iOS") {
      if (flowContext.stage === "post_install" || flowContext.stage === "インストール後") {
        lines.push("");
        lines.push("## Troubleshooting Steps for iPhone Post-Install Issues");
        lines.push("1. Settings > Cellular > check yah.mobile eSIM line is ON");
        lines.push("2. Settings > Cellular > yah.mobile > Turn on Data Roaming");
        lines.push("3. Settings > Cellular > yah.mobile > Cellular Data Network > APN: yah.mobile");
        lines.push("4. Settings > Cellular > set yah.mobile as Primary for Cellular Data");
        lines.push("5. Toggle Airplane Mode ON then OFF");
        lines.push("6. Settings > General > About > check for Carrier Settings Update");
        lines.push("7. Restart device");
        lines.push("8. If still not working: Settings > General > Transfer or Reset iPhone > Reset Network Settings");
      } else {
        lines.push("");
        lines.push("## Troubleshooting Steps for iPhone Pre-Install Issues");
        lines.push("1. Confirm device is iPhone XS or later with iOS 14+");
        lines.push("2. Settings > General > About > check 'Available SIM' or 'EID' field exists");
        lines.push("3. Ensure stable Wi-Fi connection for QR code scanning");
        lines.push("4. Settings > Cellular > Add eSIM > Use QR Code");
        lines.push("5. If QR code doesn't scan: try manual entry with SM-DP+ address and activation code");
        lines.push("6. If 'eSIM not supported': check device is carrier-unlocked");
      }
    } else if (flowContext.device === "Android") {
      if (flowContext.stage === "post_install" || flowContext.stage === "インストール後") {
        lines.push("");
        lines.push("## Troubleshooting Steps for Android Post-Install Issues");
        lines.push("1. Settings > Network & Internet > SIMs > check yah.mobile eSIM is enabled");
        lines.push("2. Settings > Network & Internet > SIMs > yah.mobile > enable Data Roaming");
        lines.push("3. Settings > Network & Internet > SIMs > yah.mobile > Access Point Names > Add: Name=yah.mobile, APN=yah.mobile");
        lines.push("4. Set yah.mobile as default for Mobile Data");
        lines.push("5. Toggle Airplane Mode ON then OFF");
        lines.push("6. Restart device");
        lines.push("7. If still not working: Settings > System > Reset options > Reset Wi-Fi, mobile & Bluetooth");
      } else {
        lines.push("");
        lines.push("## Troubleshooting Steps for Android Pre-Install Issues");
        lines.push("1. Confirm device supports eSIM (Google Pixel 3+, Samsung Galaxy S20+, etc.)");
        lines.push("2. Settings > Network & Internet > SIMs > Add eSIM");
        lines.push("3. Scan QR code or enter activation code manually");
        lines.push("4. If 'eSIM not available': check device is carrier-unlocked");
        lines.push("5. Ensure stable Wi-Fi connection during installation");
      }
    }
  } else if (flowContext.category === "pricing" || flowContext.category === "購入") {
    lines.push("");
    lines.push("## Pricing & Plans — Complete Reference");
    lines.push("");
    lines.push("### Available Plans (all tax-included, Japan-only data)");
    lines.push("| Plan | Data | Duration | Price | Best For |");
    lines.push("|------|------|----------|-------|----------|");
    lines.push("| Light | 3GB | 7 days | ¥1,078 | Short trips (3-5 days), light usage (maps, messaging) |");
    lines.push("| Standard | 5GB | 15 days | ¥1,848 | 1-2 week trips, moderate usage |");
    lines.push("| Value | 10GB | 30 days | ¥3,278 | 2-4 week trips, regular usage (social media, video calls) |");
    lines.push("| Premium | 20GB | 30 days | ¥5,478 | Heavy usage (streaming, remote work) |");
    lines.push("| Ultra | 50GB | 30 days | ¥11,000 | Power users, multiple devices via hotspot |");
    lines.push("| Unlimited | Unlimited | 30 days | ¥16,500 | No data worries, business travelers |");
    lines.push("");
    lines.push("### Additional Data Purchase");
    lines.push("- Price: 1GB = ¥550 (tax included)");
    lines.push("- How to buy: My Page or yah.mobile app > 'Add Data' button");
    lines.push("- Validity: Same as remaining plan period");
    lines.push("- Available anytime during active plan");
    lines.push("");
    lines.push("### Payment Methods");
    lines.push("- Credit cards: Visa, Mastercard, American Express (AMEX), JCB");
    lines.push("- Mobile payments: Apple Pay, Google Pay");
    lines.push("- NOT supported: PayPal, bank transfer, convenience store payment, carrier billing");
    lines.push("");
    lines.push("### Recommendation Logic");
    lines.push("- Ask: How long is your trip? How will you use data?");
    lines.push("- 1-7 days + light use → Light (¥1,078)");
    lines.push("- 1-2 weeks + moderate → Standard (¥1,848)");
    lines.push("- 2+ weeks + regular → Value (¥3,278)");
    lines.push("- Heavy streaming/work → Premium (¥5,478) or Ultra (¥11,000)");
    lines.push("- Business/no worries → Unlimited (¥16,500)");
    lines.push("- If unsure: recommend Standard as best value for most travelers");
    lines.push("");
    lines.push("### Purchase Flow");
    lines.push("1. Visit yah.mobi/app or download yah.mobile app");
    lines.push("2. Select plan → Enter payment info → Confirm purchase");
    lines.push("3. QR code for eSIM installation sent to registered email immediately");
    lines.push("4. Install eSIM before or after arriving in Japan");
    lines.push("5. Activate data when ready to use in Japan");
  } else if (flowContext.category === "refund" || flowContext.category === "返金") {
    lines.push("");
    lines.push("## Refund & Cancellation — Complete Policy");
    lines.push("");
    lines.push("### Core Policy (IMPORTANT — state this clearly)");
    lines.push("- eSIM is a DIGITAL PRODUCT — once QR code is issued, the product has been legally delivered");
    lines.push("- Once payment is complete, refunds and cancellations are NOT available");
    lines.push("");
    lines.push("### Legal Basis (use these when customer pushes back)");
    lines.push("**Primary Law: Act on Specified Commercial Transactions (特定商取引法 / Tokutei Shotorihiki-ho)**");
    lines.push("- Article 15-3 (第15条の3): In mail-order/online sales (通信販売), if the seller clearly displays a no-return/no-cancellation policy in the advertisement and purchase confirmation screen, that policy takes precedence over the default 8-day return right.");
    lines.push("- yah.mobile displays this policy at checkout as required by Article 11 and Article 15-3 proviso.");
    lines.push("- The customer actively checked a consent checkbox acknowledging the no-refund policy before completing payment.");
    lines.push("");
    lines.push("**Why eSIM is treated as delivered upon QR code issuance:**");
    lines.push("- eSIM is an intangible digital product (電磁的記録 / electromagnetic record)");
    lines.push("- Under Japanese law, delivery of a digital product occurs when the product information (QR code / activation code) is transmitted to the customer");
    lines.push("- Once the QR code email is sent, delivery is legally complete — regardless of whether the customer has installed or activated it");
    lines.push("- This is consistent with how all major eSIM providers operating in Japan handle refunds");
    lines.push("");
    lines.push("**Cooling-off (クーリングオフ) does NOT apply:**");
    lines.push("- Cooling-off rights apply only to door-to-door sales and telephone solicitation sales");
    lines.push("- Online/mail-order purchases are explicitly EXCLUDED from cooling-off (Act on Specified Commercial Transactions, Article 26 第26条)");
    lines.push("- yah.mobile is an online purchase, so cooling-off cannot be invoked");
    lines.push("");
    lines.push("**Consumer Contract Act (消費者契約法) does not override:**");
    lines.push("- The no-refund policy is NOT an unfair clause because: (1) clearly disclosed before purchase, (2) customer gave explicit consent via checkbox, (3) consistent with the nature of digital goods");
    lines.push("");
    lines.push("**Multilingual legal explanation phrases to use:**");
    lines.push("- JA: 「特定商取引法第15条の3に基づき、返品不可の特約を購入前に明示しており、お客様にご同意いただいております。また、通信販売にはクーリングオフの適用がございません。」");
    lines.push("- EN: Under Japan's Act on Specified Commercial Transactions (Article 15-3), our no-refund policy for digital products is legally valid. You agreed to this policy at checkout. Cooling-off rights do not apply to online purchases.");
    lines.push("- ZH: 根据日本《特定商业交易法》第15条之3，在网络购物中，如果商家在购买前明确显示了「不可退款」特约，该特约具有法律效力。您在结账时已勾选确认框同意此政策。网络购物不适用冷静期制度。");
    lines.push("- KO: 일본 특정상거래법 제15조의3에 따라, 구매 전 환불 불가 정책을 명시한 경우 해당 정책이 우선합니다. 고객님께서는 결제 시 이 정책에 동의하셨습니다. 온라인 구매에는 철회 권리가 적용되지 않습니다.");
    lines.push("- TH: ภายใต้กฎหมายการค้าทางการค้าที่ระบุไว้ของญี่ปุ่น (มาตรา 15-3) นโยบายไม่คืนเงินสำหรับสินค้าดิจิทัลมีผลทางกฎหมาย คุณได้ยอมรับนโยบายนี้ในขั้นตอนชำระเงินแล้ว");
    lines.push("- VI: Theo Luật Giao dịch Thương mại Đặc biệt của Nhật Bản (Mục 15-3), chính sách không hoàn tiền cho sản phẩm kỹ thuật số có giá trị pháp lý. Quý khách đã đồng ý với chính sách này khi thanh toán.");
    lines.push("");
    lines.push("- Customer consented to this policy via checkbox during purchase");
    lines.push("- This applies regardless of whether the eSIM has been installed or used");
    lines.push("");
    lines.push("### Exceptions (ONLY these 3 cases qualify for refund)");
    lines.push("1. **System failure**: yah.mobile system error caused eSIM not to be issued (QR code never delivered)");
    lines.push("2. **Duplicate charge**: Same amount charged twice for one purchase (confirmed in payment system)");
    lines.push("3. **Unauthorized use**: Credit card used without cardholder's consent (fraud)");
    lines.push("");
    lines.push("### Response Flow — CRITICAL: ALWAYS state the no-refund policy FIRST, even for exception cases");
    lines.push("1. Acknowledge the user's frustration empathetically");
    lines.push("2. **ALWAYS state the no-refund policy AND its legal basis first** (even if you suspect an exception applies)");
    lines.push("   Example: 'Our policy is that eSIM purchases are non-refundable once payment is complete, as eSIM is a digital product legally delivered upon QR code issuance, per Japan's Act on Specified Commercial Transactions Article 15-3. You agreed to this policy at checkout.'");
    lines.push("3. THEN ask if their situation matches one of the 3 exceptions");
    lines.push("4. If YES (exception): STILL acknowledge the policy first, then say 'However, your case may qualify as an exception' and guide to contact form at yah.mobi/app (CONTACT section)");
    lines.push("5. If NO (not exception): Explain clearly but kindly that refund cannot be processed, citing the legal basis");
    lines.push("6. Offer alternative help: troubleshooting connection issues, additional data purchase, etc.");
    lines.push("");
    lines.push("### ⚠️ MANDATORY: Always mention no-refund policy + legal basis in EVERY refund-related response");
    lines.push("- Even for QR code not received: state policy first, then troubleshoot");
    lines.push("- Even for duplicate charge: state policy first, then acknowledge the exception");
    lines.push("- Even for plan change request: state no-refund AND no-plan-change policy with legal basis");
    lines.push("");
    lines.push("### Common Scenarios & Responses");
    lines.push("- 'I haven't used it yet' → State policy + legal basis. No refund (digital product delivered = QR code sent)");
    lines.push("- 'I bought wrong plan' → State no-refund policy + legal basis. No plan switching either. Offer alternatives:");
    lines.push("  * Can purchase additional data (1GB = ¥550) if current plan is too small");
    lines.push("  * Can purchase a new separate plan if needed (old plan expires naturally)");
    lines.push("  * Explain: once purchased, the plan cannot be exchanged or upgraded");
    lines.push("- 'It doesn't work' → State policy first, then troubleshoot; if truly system failure, guide to form");
    lines.push("- 'I want to cancel' → State policy + legal basis. Cannot cancel after purchase; plan expires naturally");
    lines.push("- 'Charged twice' → State policy first, then: 'However, duplicate charges are an exception. Please contact us via the form at yah.mobi/app with your payment details'");
    lines.push("- 'Didn't receive QR code' → State policy first, then: 'However, if our system failed to issue your QR code, this qualifies as an exception. First check spam folder; if not there, please contact us via yah.mobi/app'");
    lines.push("");
    lines.push("### Plan Change / Switching Policy");
    lines.push("- Plan switching is NOT available (each purchase is a separate digital product)");
    lines.push("- Cannot upgrade/downgrade an existing plan");
    lines.push("- Alternative: purchase additional data (¥550/GB) or buy a new plan separately");
    lines.push("- Old plan will expire naturally at its end date");
  }
  return lines.join("\n");
}

// Search RAG documents by cosine similarity (only non-expired docs)
/**
 * Hybrid RAG search: combines embedding cosine similarity with N-gram keyword matching.
 * Final score = embeddingScore * 0.5 + keywordScore * 0.5
 * N-gram approach works for CJK languages that don't use spaces.
 */
export async function searchRagDocuments(query: string, topK = 5): Promise<string> {
  const docs = await listActiveRagDocuments();
  if (docs.length === 0) return "";

  const queryEmbedding = await getEmbedding(query);
  const queryLower = query.toLowerCase();

  // Generate N-grams (2-6 chars) for CJK-friendly matching
  const ngrams = new Set<string>();
  // Also split by spaces/punctuation for latin tokens
  const spaceTokens = queryLower.split(/[\s,、。！？!?.\-\/]+/).filter((t) => t.length >= 2);
  for (const token of spaceTokens) {
    ngrams.add(token);
    // For longer tokens, also add sub-ngrams
    for (let len = 2; len <= Math.min(6, token.length); len++) {
      for (let i = 0; i <= token.length - len; i++) {
        ngrams.add(token.substring(i, i + len));
      }
    }
  }
  // Also generate ngrams directly from the raw query (for CJK without spaces)
  for (let len = 2; len <= Math.min(6, queryLower.length); len++) {
    for (let i = 0; i <= queryLower.length - len; i++) {
      const gram = queryLower.substring(i, i + len);
      if (!/^[\s,、。！？!?.\-\/]+$/.test(gram)) {
        ngrams.add(gram);
      }
    }
  }

  const scored = docs
    .filter((d) => d.embedding && (d.embedding as number[]).length > 0)
    .map((d) => {
      // Embedding similarity score (0-1)
      const embScore =
        queryEmbedding.length > 0
          ? cosineSimilarity(queryEmbedding, d.embedding as number[])
          : 0;

      // N-gram keyword matching score
      const titleLower = (d.title || "").toLowerCase();
      const contentLower = (d.content || "").toLowerCase();

      let titleHits = 0;
      let contentHits = 0;
      const ngramArr = Array.from(ngrams);
      for (let gi = 0; gi < ngramArr.length; gi++) {
        const gram = ngramArr[gi];
        if (titleLower.includes(gram)) titleHits++;
        else if (contentLower.includes(gram)) contentHits++;
      }
      // Weight: title matches are 2x more valuable
      const totalHitScore = titleHits * 2 + contentHits;
      const maxScore = ngrams.size * 2;
      const keywordScore = maxScore > 0 ? Math.min(totalHitScore / maxScore, 1.0) : 0;

      // Hybrid score: equal weight
      const hybridScore = embScore * 0.5 + keywordScore * 0.5;

      return { doc: d, score: hybridScore };
    })
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
  language: string,
  flowContext?: { category?: string; device?: string; stage?: string; issue?: string }
): Promise<{ content: string; shouldEscalate: boolean; shouldRedirectToForm: boolean; detectedLanguage: string }> {
  // Count how many AI responses have already been sent in this session
  const aiMessageCount = history.filter((m) => m.role === "ai").length;
  // Use provided language (detection and DB update are handled by the caller)
  const detectedLang = language;
  const langName = LANGUAGE_NAMES[detectedLang] ?? "English";
  // Enhanced RAG: combine user message with flow context for better document matching
  const contextualQuery = buildContextualQuery(userMessage, flowContext);
  const ragContext = await searchRagDocuments(contextualQuery, flowContext ? 7 : 5);

  // Build flow context section for system prompt
  const flowContextSection = flowContext ? buildFlowContextPrompt(flowContext, langName) : "";

  const systemPrompt = `You are a helpful customer support assistant for yah.mobile, a Japan-only eSIM service for international travelers.
Always respond in ${langName}.

## About yah.mobile
- Japan-only eSIM service for international travelers visiting Japan
- Industry-lowest price per GB for Japan travel eSIM
- 24/7 support in 6 languages (Japanese, English, Chinese, Korean, Thai, Vietnamese)
- Plans: Light 3GB/7days ¥1,078, Standard 5GB/15days ¥1,848, Value 10GB/30days ¥3,278, Premium 20GB/30days ¥5,478, Ultra 50GB/30days ¥11,000, Unlimited/30days ¥16,500
- Payment: Credit card (Visa/Mastercard/AMEX/JCB), Apple Pay, Google Pay
- eSIM compatible devices: iPhone XS or later, Google Pixel 3 or later, Samsung Galaxy S20 or later

## Response Style & Hospitality Standards

### Core Principles (Ritz-Carlton 3 Steps of Service)
1. **Warm Welcome**: Detect user's language instantly, greet warmly in their mother tongue. Use their name if known.
2. **Anticipate & Fulfill**: Sense the real anxiety behind the question. Provide information BEFORE being asked.
3. **Fond Farewell**: After resolution, ask "Is there anything else I can help with?" and wish them a great trip.

### HEARD Method (Disney) — Emotion Management
- H=Hear: Listen fully without interrupting
- E=Empathize: Verbalize their emotion ("I understand how frustrating it must be...")
- A=Apologize: Apologize for inconvenience regardless of cause
- R=Resolve: Provide concrete step-by-step solution
- D=Document: Record for quality improvement

### Emotion Level Response Matrix
- Level 1 (Calm): Efficient, accurate information
- Level 2 (Mild anxiety): Reassurance + info ("Don't worry, let's check together")
- Level 3 (Frustrated): Empathy → Apology → Quick resolution
- Level 4 (Angry): Full acceptance → Deep empathy → Concrete action → Offer escalation to form

### De-escalation Techniques (use when emotion Level 3-4 detected)
1. Mirror their words to show you're listening
2. Label their emotion explicitly
3. Take responsibility regardless of cause
4. Declare specific actions with timeframe
5. Offer choices to restore sense of control
6. State clear timeframe to eliminate uncertainty

### Forbidden → Recommended Expressions
- "That's not possible" → "I can help you with [alternative]"
- "It's in the terms" → "Let me explain the reason..."
- "That's your responsibility" → "To prevent this in future, I recommend..."
- "I don't know" → "Let me check" / "I'll confirm with our team"
- "Please wait" (vague) → "May I have about 2 minutes?"
- "Any other questions?" (cold) → "Is there anything else you're unsure about? Please feel free to ask."

### Tone Principles
- Warmth (human touch) + Professionalism (appropriate formality)
- Clarity (specific, actionable) + Positivity (affirmative phrasing)
- Personal (avoid template-feeling responses)
- Anticipatory (provide related info before being asked)

### General Guidelines
- Be concise, polite, and professional
- Prefer natural sentences over bullet points
- For eSIM setup questions, always explain step-by-step with specific menu paths
- For pricing questions, provide specific plan details from the knowledge base
- Aim to resolve 99.9% of inquiries through AI chat without any human escalation
- Never say "I'll check and get back to you" or "I'll connect you to a human operator" — always try to answer directly or guide to the contact form
- When user says "still not working" or similar, provide the NEXT troubleshooting step (don't repeat previous steps)
${flowContextSection}
## Rules for Unanswerable Questions
- For questions involving personal information or account-specific issues: guide the user to the contact form at yah.mobi/app (scroll to the CONTACT section)
- For technical eSIM setup: explain the steps carefully and patiently, always provide specific next steps
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
