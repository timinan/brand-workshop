import { describe, it, expect } from "vitest";
import { runNamer } from "@/lib/agents/namer";
import type { LLMProvider, LLMChunk } from "@/lib/providers/types";

function llmReturning(text: string): LLMProvider {
  return {
    name: "gemini",
    async *stream(): AsyncIterable<LLMChunk> {
      yield { type: "text_delta", text };
      yield { type: "done", fullText: text };
    },
  };
}

describe("runNamer", () => {
  it("parses valid JSON output", async () => {
    const json = JSON.stringify({
      candidates: [
        { name: "Pebble", reasoning: "short" },
        { name: "Mosaic", reasoning: "assembly" },
        { name: "Lattice", reasoning: "structured" },
      ],
      top_pick: "Pebble",
    });
    const out = await runNamer({ brief: "a pebble tool", llm: llmReturning(json), onDelta: () => {} });
    expect(out.top_pick).toBe("Pebble");
    expect(out.candidates).toHaveLength(3);
  });

  it("extracts JSON from markdown code fences", async () => {
    const wrapped = "Here you go:\n```json\n" + JSON.stringify({
      candidates: [{ name: "A", reasoning: "x" }, { name: "B", reasoning: "y" }],
      top_pick: "A",
    }) + "\n```\n";
    const out = await runNamer({ brief: "x", llm: llmReturning(wrapped), onDelta: () => {} });
    expect(out.top_pick).toBe("A");
  });

  it("throws on schema-invalid output", async () => {
    const bad = JSON.stringify({ candidates: [], top_pick: "X" });
    await expect(runNamer({ brief: "x", llm: llmReturning(bad), onDelta: () => {} })).rejects.toThrow();
  });

  it("calls onDelta for each text chunk", async () => {
    const json = JSON.stringify({
      candidates: [{ name: "A", reasoning: "x" }, { name: "B", reasoning: "y" }],
      top_pick: "A",
    });
    const deltas: string[] = [];
    await runNamer({ brief: "x", llm: llmReturning(json), onDelta: (d) => deltas.push(d) });
    expect(deltas.join("")).toBe(json);
  });
});

import { runNamerSimilar } from "@/lib/agents/namer";

function llmThatReturnsSingle(payload: string) {
  const recorder: { lastUserPrompt?: string } = {};
  const llm = {
    name: "gemini" as const,
    async *stream(opts: { userPrompt: string }) {
      recorder.lastUserPrompt = opts.userPrompt;
      yield { type: "text_delta" as const, text: payload };
      yield { type: "done" as const, fullText: payload };
    },
  };
  Object.defineProperty(llm, "lastUserPrompt", {
    get() { return recorder.lastUserPrompt; },
    enumerable: true,
  });
  return llm as typeof llm & { readonly lastUserPrompt: string | undefined };
}

describe("runNamerSimilar", () => {
  it("returns a single name with reasoning", async () => {
    const payload = JSON.stringify({ candidate: { name: "Pebbl", reasoning: "a softer variant" } });
    const llm = llmThatReturnsSingle(payload);
    const result = await runNamerSimilar({
      brief: "a meditation app",
      similarTo: { name: "Pebble", failedChecks: ["domain"] },
      avoid: ["Pebble"],
      llm,
      onDelta: () => {},
    });
    expect(result.name).toBe("Pebbl");
    expect(result.reasoning).toBe("a softer variant");
  });

  it("includes the rejected name and failed checks in the user prompt", async () => {
    const payload = JSON.stringify({ candidate: { name: "Mosaicy", reasoning: "x" } });
    const llm = llmThatReturnsSingle(payload);
    await runNamerSimilar({
      brief: "tiling startup",
      similarTo: { name: "Mosaic", failedChecks: ["trademark", "domain"] },
      avoid: ["Mosaic"],
      llm,
      onDelta: () => {},
    });
    expect(llm.lastUserPrompt).toContain("Mosaic");
    expect(llm.lastUserPrompt).toContain("trademark");
    expect(llm.lastUserPrompt).toContain("domain");
  });

  it("includes the avoid list in the user prompt", async () => {
    const payload = JSON.stringify({ candidate: { name: "Brick", reasoning: "x" } });
    const llm = llmThatReturnsSingle(payload);
    await runNamerSimilar({
      brief: "tiling startup",
      similarTo: { name: "Mosaic", failedChecks: ["trademark"] },
      avoid: ["Mosaic", "Mosaick", "Mosaiq"],
      llm,
      onDelta: () => {},
    });
    expect(llm.lastUserPrompt).toContain("Mosaick");
    expect(llm.lastUserPrompt).toContain("Mosaiq");
  });
});
