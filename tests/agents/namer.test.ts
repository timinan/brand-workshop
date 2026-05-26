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
