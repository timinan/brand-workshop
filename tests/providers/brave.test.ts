import { describe, it, expect, vi, beforeEach } from "vitest";
import { BraveSearchProvider } from "@/lib/providers/search/brave";

describe("BraveSearchProvider", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns normalized SearchResult[] from Brave API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: "Pebble Inc", url: "https://pebble.com", description: "A pebble company" },
            { title: "Other", url: "https://other.com", description: "Other thing" },
          ],
        },
      }),
    }));

    const p = new BraveSearchProvider({ apiKey: "test" });
    const results = await p.search("pebble", { maxResults: 2 });

    expect(results).toEqual([
      { title: "Pebble Inc", url: "https://pebble.com", snippet: "A pebble company" },
      { title: "Other", url: "https://other.com", snippet: "Other thing" },
    ]);
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }));
    const p = new BraveSearchProvider({ apiKey: "test" });
    await expect(p.search("x")).rejects.toThrow(/429/);
  });
});
