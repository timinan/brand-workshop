import type { LLMProvider, SearchProvider, ImageProvider } from "./types";
import { GeminiProvider } from "./llm/gemini";
import { AnthropicProvider } from "./llm/anthropic";
import { BraveSearchProvider } from "./search/brave";
import { AnthropicSearchProvider } from "./search/anthropic";
import { CloudflareImageProvider } from "./image/cloudflare";
import { FalImageProvider } from "./image/fal";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getLLMProvider(): LLMProvider {
  const choice = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  if (choice === "anthropic") return new AnthropicProvider({ apiKey: required("ANTHROPIC_API_KEY") });
  if (choice === "gemini") return new GeminiProvider({ apiKey: required("GEMINI_API_KEY") });
  throw new Error(`Unknown LLM_PROVIDER: ${choice}`);
}

export function getSearchProvider(): SearchProvider {
  const choice = (process.env.SEARCH_PROVIDER ?? "brave").toLowerCase();
  if (choice === "anthropic") return new AnthropicSearchProvider({ apiKey: required("ANTHROPIC_API_KEY") });
  if (choice === "brave") return new BraveSearchProvider({ apiKey: required("BRAVE_API_KEY") });
  throw new Error(`Unknown SEARCH_PROVIDER: ${choice}`);
}

export function getImageProvider(): ImageProvider {
  const choice = (process.env.IMAGE_PROVIDER ?? "cloudflare").toLowerCase();
  if (choice === "fal") return new FalImageProvider({ apiKey: required("FAL_KEY") });
  if (choice === "cloudflare") {
    return new CloudflareImageProvider({
      accountId: required("CLOUDFLARE_ACCOUNT_ID"),
      apiToken: required("CLOUDFLARE_API_TOKEN"),
    });
  }
  throw new Error(`Unknown IMAGE_PROVIDER: ${choice}`);
}
