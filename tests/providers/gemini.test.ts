import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiProvider } from "@/lib/providers/llm/gemini";

const mockStream = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContentStream: (req: unknown) => mockStream(req),
    }),
  })),
}));

describe("GeminiProvider", () => {
  beforeEach(() => mockStream.mockReset());

  it("yields text_delta chunks and a final done chunk", async () => {
    mockStream.mockResolvedValueOnce({
      stream: (async function* () {
        yield { text: () => "Hel" };
        yield { text: () => "lo" };
      })(),
      response: Promise.resolve({ text: () => "Hello" }),
    });

    const provider = new GeminiProvider({ apiKey: "test" });
    const chunks = [];
    for await (const c of provider.stream({ systemPrompt: "s", userPrompt: "u" })) chunks.push(c);

    expect(chunks).toEqual([
      { type: "text_delta", text: "Hel" },
      { type: "text_delta", text: "lo" },
      { type: "done", fullText: "Hello" },
    ]);
  });

  it("emits tool_use when the model issues a web_search function call", async () => {
    mockStream.mockResolvedValueOnce({
      stream: (async function* () {
        yield {
          text: () => "",
          functionCalls: () => [{ name: "web_search", args: { query: "pebble trademark" } }],
        };
      })(),
      response: Promise.resolve({ text: () => "" }),
    });

    const provider = new GeminiProvider({ apiKey: "test" });
    const chunks = [];
    for await (const c of provider.stream({
      systemPrompt: "s", userPrompt: "u",
      tools: [{ name: "web_search", description: "search the web" }],
    })) chunks.push(c);

    expect(chunks.find((c) => c.type === "tool_use")).toEqual({
      type: "tool_use", tool: "web_search", query: "pebble trademark",
    });
  });
});
