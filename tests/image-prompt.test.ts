import { describe, it, expect } from "vitest";
import { buildLogoImagePrompt, isNsfwImageError } from "@/lib/image-prompt";

describe("buildLogoImagePrompt", () => {
  it("does not embed the user brief", () => {
    const p = buildLogoImagePrompt("Pebble", "wordmark only", false);
    expect(p).toContain("Pebble");
    expect(p).not.toContain("inspired by");
  });

  it("safe mode omits brand name quoting", () => {
    const p = buildLogoImagePrompt("Pebble", "abstract symbol", true);
    expect(p).toContain("abstract geometric brand mark");
    expect(p).not.toContain('"Pebble"');
  });
});

describe("isNsfwImageError", () => {
  it("detects Cloudflare NSFW payload", () => {
    const err = new Error('Cloudflare image gen failed: 400 {"code":3030,"message":"NSFW content"}');
    expect(isNsfwImageError(err)).toBe(true);
  });
});
