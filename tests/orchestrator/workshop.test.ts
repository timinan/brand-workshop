import { describe, it, expect, vi } from "vitest";
import { runWorkshop } from "@/lib/orchestrator/workshop";
import type { LLMProvider, LLMChunk, SearchProvider, ImageProvider } from "@/lib/providers/types";
import type { WorkshopEvent } from "@/lib/events/types";

function llmThatReturns(...payloads: string[]): LLMProvider {
  let i = 0;
  return {
    name: "gemini",
    async *stream(): AsyncIterable<LLMChunk> {
      const text = payloads[i++ % payloads.length];
      yield { type: "text_delta", text };
      yield { type: "done", fullText: text };
    },
  };
}

const search: SearchProvider = { name: "brave", search: async () => [] };
const image: ImageProvider = {
  name: "cloudflare",
  generate: async () => ({ url: "https://img/x.png" }),
};

const goodNamer = JSON.stringify({
  candidates: [
    { name: "Pebble", reasoning: "a" }, { name: "Mosaic", reasoning: "b" }, { name: "Lattice", reasoning: "c" },
  ],
  top_pick: "Pebble",
});
const goodScout = JSON.stringify({
  scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [], recommendation: "proceed", vettedName: "Pebble",
});
const goodCopy = JSON.stringify({
  taglines: [
    { tagline: "T1", angle: "witty" }, { tagline: "T2", angle: "clear" }, { tagline: "T3", angle: "aspirational" },
  ],
  voice: "calm",
});
const goodStrategy = JSON.stringify({
  positioning: "p",
  competitors: [
    { name: "X", url: "https://x.com", differentiator: "a" },
    { name: "Y", url: "https://y.com", differentiator: "b" },
  ],
  differentiation: "d", risk: "r",
});

describe("runWorkshop", () => {
  it("emits workshop_started, agent_started/completed for each agent, brand_kit_ready", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodNamer, goodScout, goodCopy, goodStrategy);
    await runWorkshop({
      brief: "an AI tool for PMs",
      getLlm: () => llm, getSearch: () => search, getImage: () => image,
      emit: (e) => events.push(e),
    });
    expect(events[0].type).toBe("workshop_started");
    expect(events.filter((e) => e.type === "agent_completed").length).toBe(5);
    expect(events.at(-1)?.type).toBe("brand_kit_ready");
  });

  it("runs Brand Scout exactly once and ignores swap_to_next recommendation", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodNamer, goodScout, goodCopy, goodStrategy);
    await runWorkshop({
      brief: "x", getLlm: () => llm, getSearch: () => search, getImage: () => image,
      emit: (e) => events.push(e),
    });
    expect(events.filter((e) => e.type === "agent_started" && e.agent === "brand-scout").length).toBe(1);
    expect(events.find((e) => e.type === "auto_swap")).toBeUndefined();
  });

  it("aborts with workshop_error when Namer fails schema", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns("not valid json", goodScout, goodCopy, goodStrategy);
    await runWorkshop({ brief: "x", getLlm: () => llm, getSearch: () => search, getImage: () => image, emit: (e) => events.push(e) });
    expect(events.find((e) => e.type === "workshop_error" && e.agent === "namer")).toBeTruthy();
    expect(events.find((e) => e.type === "brand_kit_ready")).toBeUndefined();
  });
});
