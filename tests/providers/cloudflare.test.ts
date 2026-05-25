import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudflareImageProvider } from "@/lib/providers/image/cloudflare";

describe("CloudflareImageProvider", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns a data URL for the generated PNG", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { image: "AAEC" } }),
    }));
    const p = new CloudflareImageProvider({ accountId: "acc", apiToken: "tok" });
    const out = await p.generate("a pebble logo");
    expect(out.url).toBe("data:image/png;base64,AAEC");
  });

  it("throws on non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" }));
    const p = new CloudflareImageProvider({ accountId: "acc", apiToken: "tok" });
    await expect(p.generate("x")).rejects.toThrow(/500/);
  });
});
