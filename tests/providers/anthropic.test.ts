import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnthropicProvider } from "@/lib/providers/llm/anthropic";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: (req: unknown) => mockCreate(req) },
  })),
}));

function fakeStream(events: unknown[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const e of events) yield e;
    },
  };
}

describe("AnthropicProvider", () => {
  beforeEach(() => mockCreate.mockReset());

  it("yields text_delta chunks and done", async () => {
    mockCreate.mockReturnValueOnce(
      fakeStream([
        { type: "content_block_delta", delta: { type: "text_delta", text: "Hel" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "lo" } },
        { type: "message_stop" },
      ]),
    );

    const provider = new AnthropicProvider({ apiKey: "test" });
    const chunks = [];
    for await (const c of provider.stream({ systemPrompt: "s", userPrompt: "u" })) chunks.push(c);

    expect(chunks).toEqual([
      { type: "text_delta", text: "Hel" },
      { type: "text_delta", text: "lo" },
      { type: "done", fullText: "Hello" },
    ]);
  });

  it("yields tool_use when web_search tool is invoked", async () => {
    mockCreate.mockReturnValueOnce(
      fakeStream([
        {
          type: "content_block_start",
          content_block: { type: "tool_use", name: "web_search", input: {} },
        },
        {
          type: "content_block_delta",
          delta: { type: "input_json_delta", partial_json: '{"query":"pebble trademark"}' },
        },
        { type: "content_block_stop" },
        { type: "message_stop" },
      ]),
    );

    const provider = new AnthropicProvider({ apiKey: "test" });
    const chunks = [];
    for await (const c of provider.stream({
      systemPrompt: "s", userPrompt: "u",
      tools: [{ name: "web_search", description: "x" }],
    })) chunks.push(c);

    expect(chunks).toContainEqual({ type: "tool_use", tool: "web_search", query: "pebble trademark" });
  });
});
