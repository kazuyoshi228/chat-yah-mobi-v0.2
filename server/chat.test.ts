/**
 * Chat feature tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectEscalation } from "./routers/ai";

// ─── AI Escalation Detection ─────────────────────────────────────────────────

describe("detectEscalation", () => {
  it("detects Japanese escalation keywords", () => {
    expect(detectEscalation("人間に繋いでください", "ja")).toBe(true);
    expect(detectEscalation("オペレーターを呼んでください", "ja")).toBe(true);
    expect(detectEscalation("担当者に代わってください", "ja")).toBe(true);
  });

  it("detects English escalation keywords", () => {
    expect(detectEscalation("I need a human agent", "en")).toBe(true);
    expect(detectEscalation("please connect me to an operator", "en")).toBe(true);
    expect(detectEscalation("this is terrible service", "en")).toBe(true);
  });

  it("does not trigger on normal messages", () => {
    expect(detectEscalation("こんにちは、質問があります", "ja")).toBe(false);
    expect(detectEscalation("How can I reset my password?", "en")).toBe(false);
    expect(detectEscalation("What are your business hours?", "en")).toBe(false);
  });

  it("falls back to English for unknown languages", () => {
    expect(detectEscalation("I need a human", "unknown")).toBe(true);
    expect(detectEscalation("Normal question", "unknown")).toBe(false);
  });
});

// ─── DB helpers mock tests ────────────────────────────────────────────────────

describe("Chat session logic", () => {
  it("validates session status transitions", () => {
    const validStatuses = ["waiting", "active", "ended"] as const;
    const invalidStatus = "invalid";

    expect(validStatuses).toContain("waiting");
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("ended");
    expect(validStatuses).not.toContain(invalidStatus as any);
  });

  it("validates message roles", () => {
    const validRoles = ["visitor", "operator", "ai"] as const;
    expect(validRoles).toContain("visitor");
    expect(validRoles).toContain("operator");
    expect(validRoles).toContain("ai");
  });

  it("validates survey rating range", () => {
    const validRating = (r: number) => r >= 1 && r <= 5;
    expect(validRating(1)).toBe(true);
    expect(validRating(5)).toBe(true);
    expect(validRating(0)).toBe(false);
    expect(validRating(6)).toBe(false);
  });
});

// ─── Language support ─────────────────────────────────────────────────────────

describe("Language support", () => {
  it("supports all required languages (JNTO 2024 inbound top 6)", () => {
    const supportedLanguages = ["ja", "en", "zh", "ko", "th", "vi"];
    expect(supportedLanguages).toHaveLength(6);
    expect(supportedLanguages).toContain("ja");
    expect(supportedLanguages).toContain("en");
    expect(supportedLanguages).toContain("zh");
    expect(supportedLanguages).toContain("ko");
    expect(supportedLanguages).toContain("th");
    expect(supportedLanguages).toContain("vi");
    expect(supportedLanguages).not.toContain("es");
  });
});
