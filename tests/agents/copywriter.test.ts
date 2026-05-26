import { describe, it, expect } from "vitest";
import { runCopywriter } from "@/lib/agents/copywriter";
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

describe("runCopywriter", () => {
  it("returns 3 taglines, one per angle", async () => {
    const json = JSON.stringify({
      taglines: [
        { tagline: "Ship more, debate less", angle: "witty" },
        { tagline: "Plans into products", angle: "clear" },
        { tagline: "Where roadmaps meet reality", angle: "aspirational" },
      ],
      voice: "calm, direct, no jargon",
    });
    const out = await runCopywriter({
      name: "Pebble", brief: "x",
      llm: llmReturning(json), onDelta: () => {},
    });
    expect(out.taglines.map((t) => t.angle)).toEqual(["witty", "clear", "aspirational"]);
  });
});
