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
