/**
 * Rate limiting via Upstash Redis.
 * Provides sliding-window limiters for chat abuse prevention.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Message rate limit: max 20 messages per 1 minute per visitorId.
 * Prevents rapid-fire message spam and bot attacks.
 */
export const messageLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:msg",
});

/**
 * Session creation rate limit: max 5 sessions per 10 minutes per visitorId.
 * Prevents session-bomb attacks.
 */
export const sessionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "rl:sess",
});

/**
 * QR resend rate limit: max 3 resends per 30 minutes per email.
 * Prevents email-bomb attacks.
 */
export const qrResendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "30 m"),
  prefix: "rl:qr",
});

/**
 * AI response rate limit: max 30 AI calls per 5 minutes per session.
 * Prevents LLM cost abuse from long idle chats.
 */
export const aiResponseLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "5 m"),
  prefix: "rl:ai",
});

/**
 * IP-based global rate limit: max 60 requests per minute per IP.
 * Catches distributed bot attacks regardless of visitorId.
 */
export const ipLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:ip",
});

/**
 * Daily AI cost tracker: max 500 AI calls per day (global).
 * When exceeded, AI responses are paused and owner is notified.
 */
export const dailyAiCostLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(500, "1 d"),
  prefix: "rl:cost",
});

/**
 * Helper to check rate limit and return result.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  } catch (e) {
    // If Redis is down, allow the request (fail-open)
    console.warn("[RateLimit] Redis error, failing open:", e);
    return { success: true, remaining: 999, reset: 0 };
  }
}
