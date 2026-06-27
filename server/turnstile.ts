/**
 * Cloudflare Turnstile CAPTCHA verification.
 * Validates turnstile tokens on the server side before allowing session creation.
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token.
 * Returns true if the token is valid, false otherwise.
 * If TURNSTILE_SECRET_KEY is not set, verification is skipped (dev mode).
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in development if key not configured
  if (!secretKey) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }

  // Skip verification for empty tokens (widget not loaded)
  if (!token) {
    return false;
  }

  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (remoteIp) {
      body.remoteip = remoteIp;
    }

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      console.warn("[Turnstile] Verification failed:", data["error-codes"]);
    }

    return data.success;
  } catch (error) {
    console.error("[Turnstile] Verification error:", error);
    // Fail-open: allow request if Turnstile service is down
    return true;
  }
}
