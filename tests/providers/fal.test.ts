import { describe, it, expect, vi, beforeEach } from "vitest";
import { FalImageProvider } from "@/lib/providers/image/fal";

const mockSubscribe = vi.fn();
vi.mock("@fal-ai/serverless-client", () => ({
  fal: { config: vi.fn(), subscribe: (...args: unknown[]) => mockSubscribe(...args) },
}));

describe("FalImageProvider", () => {
  beforeEach(() => mockSubscribe.mockReset());

  it("returns the first image URL from fal.ai response", async () => {
    mockSubscribe.mockResolvedValueOnce({
      images: [{ url: "https://fal.media/abc.png", width: 1024, height: 1024 }],
    });

    const p = new FalImageProvider({ apiKey: "test" });
    const out = await p.generate("a pebble logo");
    expect(out.url).toBe("https://fal.media/abc.png");
  });

  it("prepends style if provided", async () => {
    mockSubscribe.mockResolvedValueOnce({ images: [{ url: "https://fal.media/x.png" }] });
    const p = new FalImageProvider({ apiKey: "test" });
    await p.generate("a pebble logo", { style: "minimal monochrome" });
    expect(mockSubscribe).toHaveBeenCalledWith(
      "fal-ai/flux/schnell",
      expect.objectContaining({ input: expect.objectContaining({ prompt: "minimal monochrome. a pebble logo" }) }),
    );
  });
});
