import { describe, it, expect, beforeEach } from "vitest";
import { getLLMProvider, getSearchProvider, getImageProvider } from "@/lib/providers/factory";

describe("provider factory", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "g";
    process.env.ANTHROPIC_API_KEY = "a";
    process.env.BRAVE_API_KEY = "b";
    process.env.CLOUDFLARE_ACCOUNT_ID = "ca";
    process.env.CLOUDFLARE_API_TOKEN = "ct";
    process.env.FAL_KEY = "f";
  });

  it("returns Cloudflare by default", () => {
    delete process.env.LLM_PROVIDER;
    expect(getLLMProvider().name).toBe("cloudflare");
  });

  it("returns Anthropic when LLM_PROVIDER=anthropic", () => {
    process.env.LLM_PROVIDER = "anthropic";
    expect(getLLMProvider().name).toBe("anthropic");
  });

  it("returns Brave by default for search", () => {
    delete process.env.SEARCH_PROVIDER;
    expect(getSearchProvider().name).toBe("brave");
  });

  it("returns Cloudflare by default for images", () => {
    delete process.env.IMAGE_PROVIDER;
    expect(getImageProvider().name).toBe("cloudflare");
  });

  it("throws if required API key is missing", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.LLM_PROVIDER = "gemini";
    expect(() => getLLMProvider()).toThrow(/GEMINI_API_KEY/);
  });
});
