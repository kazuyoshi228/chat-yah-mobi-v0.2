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

export interface EscalationEmailOptions {
  /** Operator's email address to notify */
  toEmail: string;
  /** Operator's display name */
  operatorName: string;
  /** Chat session ID */
  sessionId: number;
  /** Visitor's name (may be undefined for anonymous) */
  visitorName?: string | null;
  /** Visitor's language */
  language?: string | null;
  /** Whether this is an urgent escalation */
  urgent?: boolean;
  /** Base URL of the app (e.g. https://chat.yah.mobi) */
  appUrl?: string;
}

/**
 * Send an escalation notification email to an operator via Resend.
 * Returns true on success, false on failure (non-throwing).
 */
export async function sendEscalationEmail(
  opts: EscalationEmailOptions
): Promise<boolean> {
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
  const chatUrl = `${appUrl}/operator/chats/${sessionId}`;

  const subject = `${urgentBadge}Operator requested: ${visitorLabel}${langLabel} — Session #${sessionId}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Operator Request</title>
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
              ${urgent ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#dc2626;font-size:13px;font-weight:600;">🚨 Urgent escalation request</p>
              </div>` : ""}
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hi ${operatorName},</p>
              <p style="margin:0 0 24px;color:#111827;font-size:15px;line-height:1.6;">
                A visitor has requested to speak with a human operator. Please respond as soon as possible.
              </p>
              <!-- Details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">Session ID</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">#${sessionId}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Visitor</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">${visitorLabel}</td>
                      </tr>
                      ${language ? `<tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Language</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">${language.toUpperCase()}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Time</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} JST</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${chatUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">
                      Open Chat →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This notification was sent by yah.mobile Chat Support. You are receiving this because you are registered as an operator.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.resendFromEmail,
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      console.warn("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Escalation email sent to ${toEmail} for session #${sessionId}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send escalation email:", err);
    return false;
  }
}

/**
 * Send a new chat notification email to all online operators.
 * Used when a new session starts and immediate operator attention is needed.
 */
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
  const chatUrl = `${appUrl}/operator/chats/${sessionId}`;
  const subject = `New chat started: ${visitorLabel}${langLabel} — Session #${sessionId}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Chat</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#000000;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">YAH.MOBILE</p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Chat Support</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hi ${operatorName},</p>
              <p style="margin:0 0 24px;color:#111827;font-size:15px;line-height:1.6;">
                A new chat session has started. The AI is handling it, but you may want to monitor the conversation.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">Session ID</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">#${sessionId}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Visitor</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">${visitorLabel}</td>
                      </tr>
                      ${language ? `<tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Language</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;">${language.toUpperCase()}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">First message</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-style:italic;">"${initialMessage.slice(0, 200)}${initialMessage.length > 200 ? "…" : ""}"</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#000000;border-radius:8px;">
                    <a href="${chatUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                      View Chat →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This notification was sent by yah.mobile Chat Support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: ENV.resendFromEmail,
      to: toEmail,
      subject,
      html,
    });

    if (error) {
      console.warn("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] New chat email sent to ${toEmail} for session #${sessionId}`);
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send new chat email:", err);
    return false;
  }
}
