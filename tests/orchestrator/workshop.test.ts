import { describe, it, expect } from "vitest";
import {
  runNamerPhase,
  runBrandScoutPhase,
  runFinishPhase,
} from "@/lib/orchestrator/workshop";
import type { LLMProvider, LLMChunk, SearchProvider, ImageProvider } from "@/lib/providers/types";
import type { WorkshopEvent } from "@/lib/events/types";
import type { NamerOutput, BrandScoutOutput } from "@/lib/agents/types";

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

const goodNamerJson = JSON.stringify({
  candidates: [
    { name: "Pebble", reasoning: "a" },
    { name: "Mosaic", reasoning: "b" },
    { name: "Lattice", reasoning: "c" },
  ],
  top_pick: "Pebble",
});
const goodScoutJson = JSON.stringify({
  scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [],
  recommendation: "proceed",
  vettedName: "Pebble",
});
const goodCopyJson = JSON.stringify({
  taglines: [
    { tagline: "T1", angle: "witty" },
    { tagline: "T2", angle: "clear" },
    { tagline: "T3", angle: "aspirational" },
  ],
  voice: "calm",
});
const goodStrategyJson = JSON.stringify({
  positioning: "p",
  competitors: [
    { name: "X", url: "https://x.com", differentiator: "a" },
    { name: "Y", url: "https://y.com", differentiator: "b" },
  ],
  differentiation: "d",
  risk: "r",
});

const goodNamerOutput: NamerOutput = JSON.parse(goodNamerJson);
const goodScoutOutput: BrandScoutOutput = JSON.parse(goodScoutJson);

describe("runNamerPhase", () => {
  it("emits workshop_started + namer started/completed and returns NamerOutput", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodNamerJson);
    const out = await runNamerPhase({
      brief: "an AI tool for PMs",
      getLlm: () => llm,
      emit: (e) => events.push(e),
    });
    expect(events[0].type).toBe("workshop_started");
    expect(events.find((e) => e.type === "agent_started" && e.agent === "namer")).toBeTruthy();
    expect(events.find((e) => e.type === "agent_completed" && e.agent === "namer")).toBeTruthy();
    expect(out.top_pick).toBe("Pebble");
    expect(out.candidates).toHaveLength(3);
  });

  it("emits workshop_error and throws when Namer fails schema", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns("not valid json");
    await expect(
      runNamerPhase({ brief: "x", getLlm: () => llm, emit: (e) => events.push(e) }),
    ).rejects.toBeTruthy();
    expect(events.find((e) => e.type === "workshop_error" && e.agent === "namer")).toBeTruthy();
  });
});

describe("runBrandScoutPhase", () => {
  it("emits brand-scout started/completed and returns BrandScoutOutput with vettedName === chosenName", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodScoutJson);
    const out = await runBrandScoutPhase({
      brief: "x",
      chosenName: "Mosaic",
      getLlm: () => llm,
      getSearch: () => search,
      emit: (e) => events.push(e),
    });
    expect(events.find((e) => e.type === "agent_started" && e.agent === "brand-scout")).toBeTruthy();
    expect(events.find((e) => e.type === "agent_completed" && e.agent === "brand-scout")).toBeTruthy();
    // vettedName is forced to chosenName regardless of what the model returned
    expect(out.vettedName).toBe("Mosaic");
  });

  it("does NOT emit auto_swap (auto-swap removed)", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodScoutJson);
    await runBrandScoutPhase({
      brief: "x",
      chosenName: "Pebble",
      getLlm: () => llm,
      getSearch: () => search,
      emit: (e) => events.push(e),
    });
    expect(events.find((e) => (e as { type: string }).type === "auto_swap")).toBeUndefined();
  });
});

describe("runFinishPhase", () => {
  it("runs the three parallel agents and emits brand_kit_ready with autoSwapped=null", async () => {
    const events: WorkshopEvent[] = [];
    const llm = llmThatReturns(goodCopyJson, goodStrategyJson);
    const kit = await runFinishPhase({
      brief: "x",
      chosenName: "Mosaic",
      namerOutput: goodNamerOutput,
      brandScoutOutput: { ...goodScoutOutput, vettedName: "Mosaic" },
      getLlm: () => llm,
      getSearch: () => search,
      getImage: () => image,
      emit: (e) => events.push(e),
    });
    expect(events.filter((e) => e.type === "agent_completed").length).toBeGreaterThanOrEqual(3);
    expect(events.at(-1)?.type).toBe("brand_kit_ready");
    expect(kit.name).toBe("Mosaic");
    expect(kit.autoSwapped).toBeNull();
    // names considered: Mosaic is the chosen one and is not rejected; others are rejected
    const considered = kit.namesConsidered;
    expect(considered.find((c) => c.name === "Mosaic")?.rejected).toBe(false);
    expect(considered.find((c) => c.name === "Pebble")?.rejected).toBe(true);
  });
});
