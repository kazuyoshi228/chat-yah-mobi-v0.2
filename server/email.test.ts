import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the resend module
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: "test-id" }, error: null }),
      },
    })),
  };
});

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "re_test_key",
    resendFromEmail: "noreply@test.com",
  },
}));

describe("email helpers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("sendEscalationEmail returns true on success", async () => {
    const { sendEscalationEmail } = await import("./email");
    const result = await sendEscalationEmail({
      toEmail: "operator@example.com",
      operatorName: "Taro Yamada",
      sessionId: 42,
      visitorName: "Test Visitor",
      language: "ja",
      urgent: true,
      appUrl: "https://chat.yah.mobi",
    });
    expect(result).toBe(true);
  });

  it("sendEscalationEmail returns false when Resend returns error", async () => {
    const { Resend } = await import("resend");
    (Resend as any).mockImplementationOnce(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Invalid API key" },
        }),
      },
    }));

    const { sendEscalationEmail } = await import("./email");
    const result = await sendEscalationEmail({
      toEmail: "operator@example.com",
      operatorName: "Taro Yamada",
      sessionId: 99,
      urgent: false,
    });
    expect(result).toBe(false);
  });

  it("sendNewChatEmail returns true on success", async () => {
    const { sendNewChatEmail } = await import("./email");
    const result = await sendNewChatEmail({
      toEmail: "operator@example.com",
      operatorName: "Hanako Suzuki",
      sessionId: 7,
      visitorName: "Visitor",
      language: "en",
      initialMessage: "Hello, I need help.",
      appUrl: "https://chat.yah.mobi",
    });
    expect(result).toBe(true);
  });
});
