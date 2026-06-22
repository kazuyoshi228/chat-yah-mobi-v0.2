import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ENV module so we can control the API key
vi.mock("./_core/env", () => ({
  ENV: {
    openAiApiKey: "sk-test-key",
    forgeApiKey: "",
    forgeApiUrl: "",
  },
}));

describe("OpenAI API key routing", () => {
  it("uses OpenAI endpoint when OPENAI_API_KEY is set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          created: 1234567890,
          model: "gpt-4o-mini",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Hello!" },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { invokeLLM } = await import("./_core/llm");
    await invokeLLM({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "ping" }],
    });

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toBe("https://api.openai.com/v1/chat/completions");

    const calledHeaders = (fetchSpy.mock.calls[0]?.[1] as RequestInit)
      ?.headers as Record<string, string>;
    expect(calledHeaders["authorization"]).toBe("Bearer sk-test-key");

    fetchSpy.mockRestore();
  });
});
