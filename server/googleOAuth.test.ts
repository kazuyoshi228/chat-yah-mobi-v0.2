import { describe, it, expect } from "vitest";

describe("Google OAuth configuration", () => {
  it("GOOGLE_CLIENT_ID is set and has correct format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    expect(clientId.length).toBeGreaterThan(0);
    expect(clientId).toContain(".apps.googleusercontent.com");
  });

  it("GOOGLE_CLIENT_SECRET is set and has correct format", () => {
    const secret = process.env.GOOGLE_CLIENT_SECRET ?? "";
    expect(secret.length).toBeGreaterThan(0);
    expect(secret).toMatch(/^GOCSPX-/);
  });

  it("Google OAuth callback URL is correctly formed", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: "https://chat.yah.mobi/api/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    expect(authUrl).toContain("accounts.google.com");
    // URLSearchParams uses + for spaces, not %20
    expect(authUrl).toContain("scope=openid");
  });
});
