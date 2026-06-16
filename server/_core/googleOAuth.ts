import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getRedirectUri(req: Request): string {
  // Use the origin from the request or fallback to production domain
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/api/auth/google/callback`;
}

export function registerGoogleOAuthRoutes(app: Express) {
  // Step 1: Redirect to Google's OAuth consent screen
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const redirectUri = getRedirectUri(req);
    const state = Buffer.from(JSON.stringify({ redirectUri })).toString("base64");

    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "select_account",
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // Step 2: Handle Google's callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      console.error("[GoogleOAuth] Error from Google:", error);
      res.redirect("/portal?error=google_auth_failed");
      return;
    }

    if (!code || !stateParam) {
      res.redirect("/portal?error=missing_params");
      return;
    }

    let redirectUri: string;
    try {
      const stateData = JSON.parse(Buffer.from(stateParam, "base64").toString());
      redirectUri = stateData.redirectUri;
    } catch {
      redirectUri = getRedirectUri(req);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[GoogleOAuth] Token exchange failed:", errText);
        res.redirect("/portal?error=token_exchange_failed");
        return;
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Get user info from Google
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoRes.ok) {
        res.redirect("/portal?error=userinfo_failed");
        return;
      }

      const googleUser = (await userInfoRes.json()) as {
        sub: string;
        email: string;
        name: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      };

      if (!googleUser.email) {
        res.redirect("/portal?error=no_email");
        return;
      }

      // Look up user by email in DB
      let user = await db.getUserByEmail(googleUser.email);

      if (!user) {
        // Auto-create user with 'user' role — admin must promote to operator/admin
        const openId = `google_${googleUser.sub}`;
        await db.upsertUser({
          openId,
          name: googleUser.name || null,
          email: googleUser.email,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByEmail(googleUser.email);
      } else {
        // Update last sign-in and sync name if changed
        await db.upsertUser({
          openId: user.openId,
          name: googleUser.name || user.name || null,
          email: googleUser.email,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByEmail(googleUser.email);
      }

      if (!user) {
        res.redirect("/portal?error=user_not_found");
        return;
      }

      // Only allow admin and operator roles
      if (user.role !== "admin" && user.role !== "operator") {
        res.redirect("/portal?error=access_denied");
        return;
      }

      // Create session JWT
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || googleUser.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect based on role
      if (user.role === "admin") {
        res.redirect("/admin");
      } else {
        res.redirect("/ops/chats");
      }
    } catch (err) {
      console.error("[GoogleOAuth] Callback error:", err);
      res.redirect("/portal?error=internal_error");
    }
  });
}
