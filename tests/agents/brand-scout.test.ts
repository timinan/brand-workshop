import { describe, it, expect } from "vitest";
import { runBrandScout } from "@/lib/agents/brand-scout";
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

const stubSearch: SearchProvider = {
  name: "brave",
  search: async () => [{ title: "Pebble Watches", url: "https://pebble.com", snippet: "smartwatch maker" }],
};

describe("runBrandScout", () => {
  it("runs 4 web searches and feeds findings to the LLM", async () => {
    const calls: string[] = [];
    const search: SearchProvider = { name: "brave", search: async (q) => (calls.push(q), []) };
    const json = JSON.stringify({
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      recommendation: "proceed",
      vettedName: "Pebble",
    });
    await runBrandScout({
      name: "Pebble", brief: "x",
      llm: llmReturning(json), search,
      onDelta: () => {}, onSearch: () => {},
    });
    expect(calls).toHaveLength(4);
  });

  it("emits onSearch for each query", async () => {
    const queries: string[] = [];
    const json = JSON.stringify({
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      recommendation: "proceed",
      vettedName: "Pebble",
    });
    await runBrandScout({
      name: "Pebble", brief: "x",
      llm: llmReturning(json), search: stubSearch,
      onDelta: () => {}, onSearch: (q) => queries.push(q),
    });
    expect(queries).toHaveLength(4);
  });

  it("forces recommendation = swap_to_next when any verdict is fail", async () => {
    const json = JSON.stringify({
      scorecard: { existingCompany: "fail", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [{ category: "existingCompany", finding: "exact-match brand" }],
      recommendation: "proceed",
      vettedName: "Pebble",
    });
    const out = await runBrandScout({
      name: "Pebble", brief: "x",
      llm: llmReturning(json), search: stubSearch,
      onDelta: () => {}, onSearch: () => {},
    });
    expect(out.recommendation).toBe("swap_to_next");
  });
});
