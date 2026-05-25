import { describe, it, expect } from "vitest";
import {
  NamerOutputSchema,
  BrandScoutOutputSchema,
  DesignerOutputSchema,
  CopywriterOutputSchema,
  StrategistOutputSchema,
  BrandKitSchema,
} from "@/lib/agents/types";

describe("agent schemas", () => {
  it("NamerOutputSchema accepts valid output", () => {
    const ok = NamerOutputSchema.safeParse({
      candidates: [
        { name: "Pebble", reasoning: "short and tactile" },
        { name: "Mosaic", reasoning: "evokes assembly" },
        { name: "Lattice", reasoning: "structured but flexible" },
      ],
      top_pick: "Pebble",
    });
    expect(ok.success).toBe(true);
  });

  it("NamerOutputSchema rejects when top_pick is not a candidate", () => {
    const fail = NamerOutputSchema.safeParse({
      candidates: [{ name: "Pebble", reasoning: "x" }],
      top_pick: "NotInList",
    });
    expect(fail.success).toBe(false);
  });

  it("BrandScoutOutputSchema accepts valid output", () => {
    const ok = BrandScoutOutputSchema.safeParse({
      scorecard: { existingCompany: "pass", domain: "warn", trademark: "pass", connotations: "pass" },
      findings: [{ category: "domain", finding: "pebble.com is taken" }],
      recommendation: "proceed_with_warning",
      vettedName: "Pebble",
    });
    expect(ok.success).toBe(true);
  });

  it("DesignerOutputSchema requires 3 concepts", () => {
    const fail = DesignerOutputSchema.safeParse({
      concepts: [{ imageUrl: "https://x/a.png", description: "x", styleTags: ["mark"] }],
    });
    expect(fail.success).toBe(false);
  });

  it("CopywriterOutputSchema rejects tagline longer than 8 words", () => {
    const fail = CopywriterOutputSchema.safeParse({
      taglines: [
        { tagline: "one two three four five six seven eight nine", angle: "witty" },
        { tagline: "short", angle: "clear" },
        { tagline: "short", angle: "aspirational" },
      ],
      voice: "calm and confident",
    });
    expect(fail.success).toBe(false);
  });

  it("StrategistOutputSchema requires at least 2 competitors", () => {
    const fail = StrategistOutputSchema.safeParse({
      positioning: "x",
      competitors: [{ name: "X", url: "https://x", differentiator: "y" }],
      differentiation: "z",
      risk: "w",
    });
    expect(fail.success).toBe(false);
  });

  it("DesignerOutputSchema accepts exactly 3 concepts", () => {
    const ok = DesignerOutputSchema.safeParse({
      concepts: [
        { imageUrl: "https://x/a.png", description: "first concept", styleTags: ["mark"] },
        { imageUrl: "https://x/b.png", description: "second concept", styleTags: ["wordmark"] },
        { imageUrl: "https://x/c.png", description: "third concept", styleTags: ["abstract"] },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("StrategistOutputSchema accepts valid output with 2 competitors", () => {
    const ok = StrategistOutputSchema.safeParse({
      positioning: "The PM tool built for speed and clarity",
      competitors: [
        { name: "Notion", url: "https://notion.so", differentiator: "docs-first" },
        { name: "Linear", url: "https://linear.app", differentiator: "eng-focused" },
      ],
      differentiation: "AI-native workflow with zero setup",
      risk: "Large incumbents with distribution advantages",
    });
    expect(ok.success).toBe(true);
  });

  it("BrandScoutOutputSchema rejects invalid recommendation", () => {
    const fail = BrandScoutOutputSchema.safeParse({
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      recommendation: "totally_invalid",
      vettedName: "Pebble",
    });
    expect(fail.success).toBe(false);
  });

  it("BrandKitSchema composes all agent outputs", () => {
    const ok = BrandKitSchema.safeParse({
      brief: "an AI tool for PMs",
      name: "Pebble",
      autoSwapped: null,
      namesConsidered: [{ name: "Acme", reasoning: "x", rejected: true, reason: "trademark" }],
      logos: [
        { imageUrl: "https://x/1.png", description: "a", styleTags: ["mark"] },
        { imageUrl: "https://x/2.png", description: "b", styleTags: ["wordmark"] },
        { imageUrl: "https://x/3.png", description: "c", styleTags: ["abstract"] },
      ],
      taglines: [
        { tagline: "Ship more, debate less", angle: "witty" },
        { tagline: "Plans into products", angle: "clear" },
        { tagline: "Where roadmaps meet reality", angle: "aspirational" },
      ],
      voice: "calm and direct",
      positioning: "x",
      competitors: [
        { name: "X", url: "https://x", differentiator: "a" },
        { name: "Y", url: "https://y", differentiator: "b" },
      ],
      differentiation: "z",
      risk: "w",
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
    });
    expect(ok.success).toBe(true);
  });
});
