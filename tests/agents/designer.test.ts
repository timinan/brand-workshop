import { describe, it, expect, vi } from "vitest";
import { runDesigner } from "@/lib/agents/designer";
import type { ImageProvider } from "@/lib/providers/types";

const fakeImage: ImageProvider = {
  name: "cloudflare",
  generate: vi.fn(async () => ({ url: "data:image/png;base64,AAEC" })),
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

  it("retries with a safer prompt after Cloudflare NSFW rejection", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error('Cloudflare image gen failed: 400 {"code":3030,"message":"NSFW"}'))
      .mockResolvedValue({ url: "data:image/png;base64,AAEC" });
    const image: ImageProvider = { name: "cloudflare", generate };

    const out = await runDesigner({
      name: "Pebble",
      brief: "adult dating app",
      image,
      onImage: () => {},
    });
    expect(out.concepts).toHaveLength(3);
    expect(generate.mock.calls.length).toBeGreaterThan(3);
  });
});
