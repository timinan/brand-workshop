import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnthropicSearchProvider } from "@/lib/providers/search/anthropic";

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({ messages: { create: (req: unknown) => mockCreate(req) } })),
}));

describe("AnthropicSearchProvider", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns normalized SearchResult[] from Anthropic web_search tool", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "web_search_tool_result",
          content: [
            { type: "web_search_result", title: "Pebble Inc", url: "https://pebble.com", encrypted_content: "...", page_age: null },
            { type: "web_search_result", title: "Pebbles cereal", url: "https://pebbles.com", encrypted_content: "...", page_age: null },
          ],
        },
        { type: "text", text: "Found 2 results." },
      ],
    });

    const p = new AnthropicSearchProvider({ apiKey: "test" });
    const results = await p.search("pebble");
    expect(results.map((r) => r.url)).toEqual(["https://pebble.com", "https://pebbles.com"]);
  });
});
