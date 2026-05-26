import { describe, it, expect } from "vitest";
import { runStrategist } from "@/lib/agents/strategist";
import type { LLMProvider, LLMChunk, SearchProvider } from "@/lib/providers/types";

function llmReturning(text: string): LLMProvider {
  return {
    name: "gemini",
    async *stream(): AsyncIterable<LLMChunk> {
      yield { type: "text_delta", text };
      yield { type: "done", fullText: text };
    },
  };
}

const search: SearchProvider = {
  name: "brave",
  search: async (q) => [
    { title: `${q} 1`, url: "https://a.com", snippet: "A" },
    { title: `${q} 2`, url: "https://b.com", snippet: "B" },
  ],
};

describe("runStrategist", () => {
  it("returns positioning + 2-3 competitors + differentiation + risk", async () => {
    const json = JSON.stringify({
      positioning: "For PMs who want to ship faster.",
      competitors: [
        { name: "Notion", url: "https://notion.so", differentiator: "general workspace" },
        { name: "Linear", url: "https://linear.app", differentiator: "issue tracker" },
      ],
      differentiation: "PM-native, not adapted from a generic tool.",
      risk: "Notion and Linear could add PM-specific features.",
    });
    const out = await runStrategist({
      name: "Pebble", brief: "an AI tool for PMs",
      llm: llmReturning(json), search,
      onDelta: () => {}, onSearch: () => {},
    });
    expect(out.competitors.length).toBeGreaterThanOrEqual(2);
    expect(out.positioning).toContain("PMs");
  });
});
