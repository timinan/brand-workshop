import { describe, it, expect, vi } from "vitest";
import { runDesigner } from "@/lib/agents/designer";
import type { ImageProvider } from "@/lib/providers/types";

const fakeImage: ImageProvider = {
  name: "cloudflare",
  generate: vi.fn(async (prompt: string) => ({ url: `https://x/${encodeURIComponent(prompt).slice(0, 20)}.png` })),
};

describe("runDesigner", () => {
  it("produces exactly 3 concepts with distinct style tags", async () => {
    const events: { conceptIndex: number; url: string }[] = [];
    const out = await runDesigner({
      name: "Pebble", brief: "an AI tool for PMs",
      image: fakeImage, onImage: (i, url) => events.push({ conceptIndex: i, url }),
    });
    expect(out.concepts).toHaveLength(3);
    expect(out.concepts.map((c) => c.styleTags[0])).toEqual(["mark-and-wordmark", "wordmark-only", "abstract-symbol"]);
    expect(events).toHaveLength(3);
  });
});
