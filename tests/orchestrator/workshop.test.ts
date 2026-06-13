import { describe, it, expect } from "vitest";
import {
  runNamerPhase,
  runBrandScoutPhase,
  runFinishPhase,
  runSuggestSimilarPhase,
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

  it("includes avoid names in the Namer user prompt when provided", async () => {
    const events: WorkshopEvent[] = [];
    let capturedPrompt = "";
    const llm: LLMProvider = {
      name: "gemini",
      async *stream(opts): AsyncIterable<LLMChunk> {
        capturedPrompt = opts.userPrompt;
        yield { type: "text_delta", text: goodNamerJson };
        yield { type: "done", fullText: goodNamerJson };
      },
    };
    await runNamerPhase({
      brief: "an AI tool for PMs",
      avoid: ["Foo", "Bar"],
      getLlm: () => llm,
      emit: (e) => events.push(e),
    });
    expect(capturedPrompt).toContain("Foo");
    expect(capturedPrompt).toContain("Bar");
    expect(capturedPrompt).toContain("do NOT repeat");
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

const passScorecardJson = (name: string) => JSON.stringify({
  scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [],
  recommendation: "proceed",
  vettedName: name,
});

const failScorecardJson = (name: string, failOn: "existingCompany" | "domain" | "trademark" | "connotations" = "domain") => {
  const sc: Record<string, "pass" | "fail"> = { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" };
  sc[failOn] = "fail";
  return JSON.stringify({
    scorecard: sc,
    findings: [{ category: failOn, finding: `${failOn} issue with ${name}` }],
    recommendation: "swap_to_next",
    vettedName: name,
  });
};

const similarCandidateJson = (name: string, reasoning = "softer variant") =>
  JSON.stringify({ candidate: { name, reasoning } });

describe("runSuggestSimilarPhase", () => {
  it("passes on attempt 1: emits one attempt cycle + suggest_success", async () => {
    const llm = llmThatReturns(
      similarCandidateJson("Pebbl"),     // Namer call 1
      passScorecardJson("Pebbl"),         // BrandScout call 1
    );
    const events: WorkshopEvent[] = [];
    await runSuggestSimilarPhase({
      brief: "a meditation app",
      rejectedName: "Pebble",
      rejectedScorecard: { existingCompany: "pass", domain: "fail", trademark: "pass", connotations: "pass" },
      rejectedFindings: [{ category: "domain", finding: "pebble.com taken" }],
      avoid: ["Pebble"],
      getLlm: () => llm,
      getSearch: () => search,
      emit: (e) => events.push(e),
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("suggest_attempt_started");
    expect(types).toContain("suggest_attempt_named");
    expect(types).toContain("suggest_attempt_vetted");
    expect(types).toContain("suggest_success");
    expect(types).not.toContain("suggest_exhausted");

    const success = events.find((e) => e.type === "suggest_success");
    expect(success).toBeDefined();
    if (success?.type === "suggest_success") {
      expect(success.name).toBe("Pebbl");
      expect(success.avoidedDuringRun).toEqual([]); // no failed attempts before success
    }
  });

  it("passes on attempt 3: emits three attempt cycles + suggest_success", async () => {
    const llm = llmThatReturns(
      similarCandidateJson("Pebbl"),       // Namer 1
      failScorecardJson("Pebbl", "domain"),// Scout 1 — fail
      similarCandidateJson("Pebbly"),      // Namer 2
      failScorecardJson("Pebbly", "trademark"), // Scout 2 — fail
      similarCandidateJson("Cobbl"),       // Namer 3
      passScorecardJson("Cobbl"),          // Scout 3 — pass
    );
    const events: WorkshopEvent[] = [];
    await runSuggestSimilarPhase({
      brief: "a meditation app",
      rejectedName: "Pebble",
      rejectedScorecard: { existingCompany: "pass", domain: "fail", trademark: "pass", connotations: "pass" },
      rejectedFindings: [],
      avoid: ["Pebble"],
      getLlm: () => llm,
      getSearch: () => search,
      emit: (e) => events.push(e),
    });

    const startedAttempts = events.filter((e) => e.type === "suggest_attempt_started");
    expect(startedAttempts).toHaveLength(3);
    const success = events.find((e) => e.type === "suggest_success");
    if (success?.type === "suggest_success") {
      expect(success.name).toBe("Cobbl");
      expect(success.avoidedDuringRun).toEqual(["Pebbl", "Pebbly"]);
    }
  });

  it("exhausts after 3 fails: emits suggest_exhausted with last attempt", async () => {
    const llm = llmThatReturns(
      similarCandidateJson("Pebbl"),       failScorecardJson("Pebbl", "domain"),
      similarCandidateJson("Pebbly"),      failScorecardJson("Pebbly", "trademark"),
      similarCandidateJson("Cobbl"),       failScorecardJson("Cobbl", "existingCompany"),
    );
    const events: WorkshopEvent[] = [];
    await runSuggestSimilarPhase({
      brief: "a meditation app",
      rejectedName: "Pebble",
      rejectedScorecard: { existingCompany: "pass", domain: "fail", trademark: "pass", connotations: "pass" },
      rejectedFindings: [],
      avoid: ["Pebble"],
      getLlm: () => llm,
      getSearch: () => search,
      emit: (e) => events.push(e),
    });

    const exhausted = events.find((e) => e.type === "suggest_exhausted");
    expect(exhausted).toBeDefined();
    if (exhausted?.type === "suggest_exhausted") {
      expect(exhausted.name).toBe("Cobbl");
      expect(exhausted.avoidedDuringRun).toEqual(["Pebbl", "Pebbly"]);
      expect(exhausted.scorecard.existingCompany).toBe("fail");
    }
    expect(events.find((e) => e.type === "suggest_success")).toBeUndefined();
  });
});
