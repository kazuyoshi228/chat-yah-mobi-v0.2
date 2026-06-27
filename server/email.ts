import { Resend } from "resend";
import { ENV } from "./_core/env";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!ENV.resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(ENV.resendApiKey);
  }
  return _resend;
}

// ---------------------------------------------------------------------------
// Shared HTML email template
// ---------------------------------------------------------------------------

interface EmailTemplateOptions {
  /** Language for the html lang attribute */
  lang?: string;
  /** Optional alert block at the top of the body */
  alertHtml?: string;
  /** Greeting line (e.g. "Hi John,") */
  greeting: string;
  /** Main body paragraph */
  bodyText: string;
  /** Rows for the details card: [label, value] pairs */
  detailRows: Array<[string, string]>;
  /** CTA button text */
  buttonText: string;
  /** CTA button URL */
  buttonUrl: string;
  /** Footer note */
  footerText: string;
}

function buildEmailHtml(opts: EmailTemplateOptions): string {
  const {
    lang = "en",
    alertHtml = "",
    greeting,
    bodyText,
    detailRows,
    buttonText,
    buttonUrl,
    footerText,
  } = opts;

  const detailRowsHtml = detailRows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">${label}</td>
        <td style="padding:6px 0;color:#111827;font-size:13px;">${value}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:0.02em;">YAH.MOBILE</p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Chat Support</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${alertHtml}
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">${greeting}</p>
              <p style="margin:0 0 24px;color:#111827;font-size:15px;line-height:1.6;">${bodyText}</p>
              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${detailRowsHtml}
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">${footerText}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Send an email via Resend. Returns true on success, false on failure (non-throwing). */
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  logLabel: string;
}): Promise<boolean> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.resendFromEmail,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.warn("[Email] Resend error:", error);
      return false;
    }
    console.log(`[Email] ${opts.logLabel}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public email functions
// ---------------------------------------------------------------------------

export interface EscalationEmailOptions {
  toEmail: string;
  operatorName: string;
  sessionId: number;
  visitorName?: string | null;
  language?: string | null;
  urgent?: boolean;
  appUrl?: string;
}

export async function sendEscalationEmail(opts: EscalationEmailOptions): Promise<boolean> {
  const {
    toEmail,
    operatorName,
    sessionId,
    visitorName,
    language,
    urgent = false,
    appUrl = "https://chat.yah.mobi",
  } = opts;

  const visitorLabel = visitorName ?? "Anonymous visitor";
  const langLabel = language ? ` (${language.toUpperCase()})` : "";
  const urgentBadge = urgent ? "🚨 URGENT — " : "";
  const chatUrl = `${appUrl}/ops/chats/${sessionId}`;
  const subject = `${urgentBadge}Operator requested: ${visitorLabel}${langLabel} — Session #${sessionId}`;

  const detailRows: Array<[string, string]> = [
    ["Session ID", `#${sessionId}`],
    ["Visitor", visitorLabel],
    ...(language ? [["Language", language.toUpperCase()] as [string, string]] : []),
    ["Time", `${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST`],
  ];

  const alertHtml = urgent
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#dc2626;font-size:13px;font-weight:600;">🚨 Urgent escalation request</p>
       </div>`
    : "";

  const html = buildEmailHtml({
    alertHtml,
    greeting: `Hi ${operatorName},`,
    bodyText: "A visitor has requested to speak with a human operator. Please respond as soon as possible.",
    detailRows,
    buttonText: "Open Chat →",
    buttonUrl: chatUrl,
    footerText: "This notification was sent by yah.mobile Chat Support. You are receiving this because you are registered as an operator.",
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
    logLabel: `Escalation email sent to ${toEmail} for session #${sessionId}`,
  });
}

export async function sendAssignmentEmail(opts: {
  toEmail: string;
  operatorName: string;
  sessionId: number;
  visitorName?: string | null;
  language?: string | null;
  initialMessage?: string | null;
  appUrl?: string;
}): Promise<boolean> {
  const {
    toEmail,
    operatorName,
    sessionId,
    visitorName,
    language,
    initialMessage,
    appUrl = "https://chat.yah.mobi",
  } = opts;

  const visitorLabel = visitorName ?? "Anonymous visitor";
  const langLabel = language ? ` (${language.toUpperCase()})` : "";
  const chatUrl = `${appUrl}/ops/chats/${sessionId}`;
  const subject = `チャットがアサインされました: ${visitorLabel}${langLabel} — Session #${sessionId}`;

  const detailRows: Array<[string, string]> = [
    ["Session ID", `#${sessionId}`],
    ["訪問者", visitorLabel],
    ...(language ? [["言語", language.toUpperCase()] as [string, string]] : []),
    ...(initialMessage
      ? [["最初のメッセージ", `&ldquo;${initialMessage.slice(0, 200)}${initialMessage.length > 200 ? "…" : ""}&rdquo;`] as [string, string]]
      : []),
    ["時刻", `${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST`],
  ];

  const html = buildEmailHtml({
    lang: "ja",
    greeting: `Hi ${operatorName},`,
    bodyText: "管理者があなたにチャットをアサインしました。できるだけ早くご対応ください。",
    detailRows,
    buttonText: "チャットを開く →",
    buttonUrl: chatUrl,
    footerText: "このメールはyah.mobile Chat Supportから送信されました。",
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
    logLabel: `Assignment email sent to ${toEmail} for session #${sessionId}`,
  });
}

export async function sendNewChatEmail(opts: {
  toEmail: string;
  operatorName: string;
  sessionId: number;
  visitorName?: string | null;
  language?: string | null;
  initialMessage: string;
  appUrl?: string;
}): Promise<boolean> {
  const {
    toEmail,
    operatorName,
    sessionId,
    visitorName,
    language,
    initialMessage,
    appUrl = "https://chat.yah.mobi",
  } = opts;

  const visitorLabel = visitorName ?? "Anonymous visitor";
  const langLabel = language ? ` (${language.toUpperCase()})` : "";
  const chatUrl = `${appUrl}/ops/chats/${sessionId}`;
  const subject = `New chat started: ${visitorLabel}${langLabel} — Session #${sessionId}`;

  const detailRows: Array<[string, string]> = [
    ["Session ID", `#${sessionId}`],
    ["Visitor", visitorLabel],
    ...(language ? [["Language", language.toUpperCase()] as [string, string]] : []),
    ["First message", `"${initialMessage.slice(0, 200)}${initialMessage.length > 200 ? "…" : ""}"`],
  ];

  const html = buildEmailHtml({
    greeting: `Hi ${operatorName},`,
    bodyText: "A new chat session has started. The AI is handling it, but you may want to monitor the conversation.",
    detailRows,
    buttonText: "View Chat →",
    buttonUrl: chatUrl,
    footerText: "This notification was sent by yah.mobile Chat Support.",
  });

  return sendEmail({
    to: toEmail,
    subject,
    html,
    logLabel: `New chat email sent to ${toEmail} for session #${sessionId}`,
  });
}

// ---------------------------------------------------------------------------
// AI Escalation Notification (owner alert when AI cannot answer)
// ---------------------------------------------------------------------------

export async function sendAIEscalationNotificationEmail(opts: {
  sessionId: number;
  visitorName?: string | null;
  visitorEmail?: string | null;
  language?: string | null;
  userMessage: string;
  aiResponse: string;
  appUrl?: string;
}): Promise<boolean> {
  const {
    sessionId,
    visitorName,
    visitorEmail,
    language,
    userMessage,
    aiResponse,
    appUrl = "https://chat.yah.mobi",
  } = opts;

  const OWNER_EMAIL = "kazuyoshi.yamada@bonfire.co.jp";
  const visitorLabel = visitorName ?? "Anonymous visitor";
  const langLabel = language ? language.toUpperCase() : "Unknown";
  const chatUrl = `${appUrl}/admin/chats/${sessionId}/reply`;
  const subject = `[yah.mobile] AIが回答できなかった質問 — Session #${sessionId}`;

  const detailRows: Array<[string, string]> = [
    ["Session ID", `#${sessionId}`],
    ["Visitor", visitorLabel],
    ...(visitorEmail ? [["Email", visitorEmail] as [string, string]] : []),
    ["Language", langLabel],
    ["Time", `${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST`],
    ["Visitor's message", `"${userMessage.slice(0, 300)}${userMessage.length > 300 ? "…" : ""}"`],
    ["AI response", `"${aiResponse.slice(0, 300)}${aiResponse.length > 300 ? "…" : ""}"`],
  ];

  const alertHtml = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
    <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">💡 RAGドキュメントへの追加を検討してください</p>
    <p style="margin:4px 0 0;color:#92400e;font-size:12px;">この質問をFAQに追加することで、AIの回答率が向上します。</p>
  </div>`;

  const html = buildEmailHtml({
    lang: "ja",
    alertHtml,
    greeting: "Yoshi さん,",
    bodyText: "AIチャットボットがオペレーターへのエスカレーションを判断しました。以下の質問内容をRAGドキュメントに追加することで、今後のAI回答率向上につながります。",
    detailRows,
    buttonText: "チャットを確認する →",
    buttonUrl: chatUrl,
    footerText: "このメールはyah.mobile Chat Supportから自動送信されました。AIがエスカレーションを判断するたびに通知されます。",
  });

  return sendEmail({
    to: OWNER_EMAIL,
    subject,
    html,
    logLabel: `AI escalation notification sent to owner for session #${sessionId}`,
  });
}

// ---------------------------------------------------------------------------
// QR Code Resend Email
// ---------------------------------------------------------------------------

/**
 * Resend the eSIM QR code to the customer's email address.
 * Called when a customer reports not receiving their QR code and we have
 * the qrCodeUrl stored from the purchase webhook.
 */
export async function sendQrResendEmail(params: {
  to: string;
  qrCodeUrl: string;
  planName: string;
  orderId: string;
  language?: string;
}): Promise<boolean> {
  const { to, qrCodeUrl, planName, orderId, language = "en" } = params;

  const subjects: Record<string, string> = {
    ja: "【yah.mobile】eSIM QRコードの再送",
    en: "【yah.mobile】eSIM QR Code Resend",
    zh: "【yah.mobile】eSIM 二维码重新发送",
    ko: "【yah.mobile】eSIM QR 코드 재발송",
    th: "【yah.mobile】ส่ง QR Code eSIM อีกครั้ง",
    vi: "【yah.mobile】Gửi lại mã QR eSIM",
  };

  const greetings: Record<string, string> = {
    ja: "お客様,",
    en: "Dear Customer,",
    zh: "尊敬的客户,",
    ko: "고객님,",
    th: "เรียนลูกค้า,",
    vi: "Kính gửi Quý khách,",
  };

  const bodyTexts: Record<string, string> = {
    ja: `eSIM QRコードを再送いたします。以下のQRコードをスキャンしてeSIMをインストールしてください。QRコードは一度のみ使用可能です。インストール後は再利用できません。`,
    en: `We are resending your eSIM QR code. Please scan the QR code below to install your eSIM. The QR code can only be used once and cannot be reused after installation.`,
    zh: `我们正在重新发送您的eSIM二维码。请扫描下方二维码安装eSIM。二维码只能使用一次，安装后无法重复使用。`,
    ko: `eSIM QR 코드를 재발송합니다. 아래 QR 코드를 스캔하여 eSIM을 설치하세요. QR 코드는 한 번만 사용 가능하며 설치 후 재사용할 수 없습니다.`,
    th: `เราส่ง QR Code eSIM ให้คุณอีกครั้ง กรุณาสแกน QR Code ด้านล่างเพื่อติดตั้ง eSIM QR Code ใช้ได้ครั้งเดียวและไม่สามารถใช้ซ้ำได้หลังติดตั้ง`,
    vi: `Chúng tôi gửi lại mã QR eSIM cho bạn. Vui lòng quét mã QR bên dưới để cài đặt eSIM. Mã QR chỉ có thể sử dụng một lần và không thể tái sử dụng sau khi cài đặt.`,
  };

  const footerTexts: Record<string, string> = {
    ja: "このメールはyah.mobile Chat Supportから自動送信されました。ご不明な点はチャットサポートまでお問い合わせください。",
    en: "This email was automatically sent by yah.mobile Chat Support. If you have any questions, please contact our chat support.",
    zh: "此邮件由yah.mobile Chat Support自动发送。如有疑问，请联系我们的聊天支持。",
    ko: "이 이메일은 yah.mobile Chat Support에서 자동으로 발송되었습니다. 문의 사항이 있으시면 채팅 지원에 문의하세요.",
    th: "อีเมลนี้ส่งโดยอัตโนมัติจาก yah.mobile Chat Support หากมีคำถาม กรุณาติดต่อฝ่ายสนับสนุนทางแชท",
    vi: "Email này được gửi tự động bởi yah.mobile Chat Support. Nếu có thắc mắc, vui lòng liên hệ hỗ trợ qua chat.",
  };

  const lang = language in subjects ? language : "en";
  const subject = subjects[lang];
  const greeting = greetings[lang];
  const bodyText = bodyTexts[lang];
  const footerText = footerTexts[lang];

  // Build QR code image block
  const qrImageBlock = `
    <div style="text-align:center;margin:24px 0;">
      <img src="${qrCodeUrl}" alt="eSIM QR Code" style="max-width:220px;width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;" />
    </div>
  `;

  const html = buildEmailHtml({
    lang,
    alertHtml: qrImageBlock,
    greeting,
    bodyText,
    detailRows: [
      ["Plan", planName],
      ["Order ID", orderId],
      ["Email", to],
    ],
    buttonText: language === "ja" ? "yah.mobile サポートへ" : "yah.mobile Support",
    buttonUrl: "https://yah.mobi/app",
    footerText,
  });

  return sendEmail({
    to,
    subject,
    html,
    logLabel: `QR code resend email sent to ${to} for order ${orderId}`,
  });
}
