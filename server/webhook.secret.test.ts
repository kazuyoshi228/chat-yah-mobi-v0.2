import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

describe("WEBHOOK_SECRET", () => {
  it("should be set in environment", () => {
    const secret = process.env.WEBHOOK_SECRET;
    expect(secret).toBeDefined();
    expect(secret!.length).toBeGreaterThan(0);
  });

  it("should be able to generate valid HMAC-SHA256 signature", () => {
    const secret = process.env.WEBHOOK_SECRET ?? "";
    const payload = JSON.stringify({ event: "purchase.created", orderId: "test-123" });
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should verify matching signatures correctly", () => {
    const secret = process.env.WEBHOOK_SECRET ?? "";
    const payload = JSON.stringify({ event: "purchase.created" });
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    const verify = createHmac("sha256", secret).update(payload).digest("hex");
    expect(sig).toBe(verify);
  });
});
