import { describe, it, expect } from "vitest";
import { synthesizeBrandKit } from "@/lib/agents/director";

const namer = {
  candidates: [
    { name: "Acme", reasoning: "x" },
    { name: "Pebble", reasoning: "y" },
    { name: "Mosaic", reasoning: "z" },
  ],
  top_pick: "Acme",
};
const brandScout = {
  scorecard: { existingCompany: "pass" as const, domain: "pass" as const, trademark: "pass" as const, connotations: "pass" as const },
  findings: [],
  recommendation: "proceed" as const,
  vettedName: "Pebble",
};
const designer = {
  concepts: [
    { imageUrl: "https://x/1.png", description: "a", styleTags: ["mark"] },
    { imageUrl: "https://x/2.png", description: "b", styleTags: ["wordmark"] },
    { imageUrl: "https://x/3.png", description: "c", styleTags: ["abstract"] },
  ],
};
const copywriter = {
  taglines: [
    { tagline: "T1", angle: "witty" as const },
    { tagline: "T2", angle: "clear" as const },
    { tagline: "T3", angle: "aspirational" as const },
  ],
  voice: "calm",
};
const strategist = {
  positioning: "p",
  competitors: [
    { name: "X", url: "https://x.com", differentiator: "a" },
    { name: "Y", url: "https://y.com", differentiator: "b" },
  ],
  differentiation: "d",
  risk: "r",
};

describe("synthesizeBrandKit", () => {
  it("uses chosenName for kit.name", () => {
    const kit = synthesizeBrandKit({ brief: "x", chosenName: "Mosaic", namer, brandScout, designer, copywriter, strategist });
    expect(kit.name).toBe("Mosaic");
  });

  it("always sets autoSwapped to null", () => {
    const kit = synthesizeBrandKit({ brief: "x", chosenName: "Acme", namer, brandScout, designer, copywriter, strategist });
    expect(kit.autoSwapped).toBeNull();
  });

  it("marks candidates other than chosenName as rejected with reason 'not chosen'", () => {
    const kit = synthesizeBrandKit({ brief: "x", chosenName: "Pebble", namer, brandScout, designer, copywriter, strategist });
    expect(kit.namesConsidered.find((n) => n.name === "Pebble")?.rejected).toBe(false);
    expect(kit.namesConsidered.find((n) => n.name === "Acme")?.rejected).toBe(true);
    expect(kit.namesConsidered.find((n) => n.name === "Acme")?.reason).toBe("not chosen");
  });
});
