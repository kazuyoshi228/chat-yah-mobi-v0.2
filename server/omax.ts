/**
 * OMAX Bappy API Client
 * OAuth2 Client Credentials + eSIM link status retrieval
 * API Base: https://api.omaxtelecom.com/bappy/v1
 * Auth:     https://id.omaxtelecom.com/realms/platform/protocol/openid-connect/token
 */

import { ENV } from "./_core/env";

const TOKEN_URL =
  "https://id.omaxtelecom.com/realms/platform/protocol/openid-connect/token";
const API_BASE = "https://api.omaxtelecom.com/bappy/v1";

// In-memory token cache (resets on server restart, fine for serverless)
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Reuse token if still valid with 30s buffer
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = ENV.omaxClientId;
  const clientSecret = ENV.omaxClientSecret;

  if (!clientId || !clientSecret) {
    throw new Error("OMAX_CLIENT_ID or OMAX_CLIENT_SECRET is not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OMAX token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.value;
}

export interface OmaxActivation {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  activation_date: string;
  data_used_mb: number;
  data_remaining_mb: number;
  expiry_date: string;
  coverage_countries: string[];
}

export interface OmaxLinkData {
  id: string;
  name: string;
  iccid: string;
  status: "active" | "not_installed" | "installed" | "expired" | "error" | string;
  created_at: string;
  lpa_profile: string;
  apple_activation_url: string;
  android_activation_url: string;
  data_used_mb: number;
  data_remaining_mb: number;
  activations: OmaxActivation[];
}

/**
 * Get eSIM link status by ICCID or link UUID
 * GET /v1/links/{identifier}
 */
export async function getLinkStatus(
  identifier: string
): Promise<OmaxLinkData | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/links/${encodeURIComponent(identifier)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OMAX getLinkStatus failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as { success: boolean; data: OmaxLinkData };
    if (!json.success) return null;
    return json.data;
  } catch (err) {
    console.error("[OMAX] getLinkStatus error:", err);
    throw err;
  }
}

/**
 * Check if an eSIM has failed to provision
 * Returns true if status indicates provisioning failure
 */
export function isProvisioningFailed(status: string): boolean {
  return ["error", "not_installed"].includes(status);
}

/**
 * Check if an eSIM has expired unexpectedly early
 * (expired but was activated less than 80% of expected duration)
 */
export function isExpiredEarly(link: OmaxLinkData): boolean {
  if (link.status !== "expired") return false;
  const activation = link.activations.find((a) => a.status === "expired");
  if (!activation) return false;
  const start = new Date(activation.activation_date).getTime();
  const end = new Date(activation.expiry_date).getTime();
  const expectedDuration = end - start;
  const elapsed = Date.now() - start;
  return elapsed < expectedDuration * 0.8;
}
