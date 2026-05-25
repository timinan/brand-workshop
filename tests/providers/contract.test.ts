import { describe, it, expect, vi } from "vitest";
import type { LLMProvider, SearchProvider, ImageProvider } from "@/lib/providers/types";

// fal.config() is called during FalImageProvider construction; stub the module
// so we don't require real credentials at the test boundary.
vi.mock("@fal-ai/serverless-client", () => ({
  fal: { config: vi.fn(), subscribe: vi.fn() },
}));
import { GeminiProvider } from "@/lib/providers/llm/gemini";
import { AnthropicProvider } from "@/lib/providers/llm/anthropic";
import { BraveSearchProvider } from "@/lib/providers/search/brave";
import { AnthropicSearchProvider } from "@/lib/providers/search/anthropic";
import { CloudflareImageProvider } from "@/lib/providers/image/cloudflare";
import { FalImageProvider } from "@/lib/providers/image/fal";

function assertIsLLM(p: LLMProvider) {
  expect(typeof p.stream).toBe("function");
  expect(p.name === "gemini" || p.name === "anthropic").toBe(true);
}
function assertIsSearch(p: SearchProvider) {
  expect(typeof p.search).toBe("function");
  expect(p.name === "brave" || p.name === "anthropic").toBe(true);
}
function assertIsImage(p: ImageProvider) {
  expect(typeof p.generate).toBe("function");
  expect(p.name === "fal" || p.name === "cloudflare").toBe(true);
}

describe("provider contracts", () => {
  it("LLM providers all conform", () => {
    assertIsLLM(new GeminiProvider({ apiKey: "x" }));
    assertIsLLM(new AnthropicProvider({ apiKey: "x" }));
  });
  it("Search providers all conform", () => {
    assertIsSearch(new BraveSearchProvider({ apiKey: "x" }));
    assertIsSearch(new AnthropicSearchProvider({ apiKey: "x" }));
  });
  it("Image providers all conform", () => {
    assertIsImage(new CloudflareImageProvider({ accountId: "a", apiToken: "t" }));
    assertIsImage(new FalImageProvider({ apiKey: "x" }));
  });
});
