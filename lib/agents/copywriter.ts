import type { LLMProvider } from "@/lib/providers/types";
import { CopywriterOutputSchema, type CopywriterOutput } from "./types";
import { extractJson } from "./namer";

const SYSTEM_PROMPT = `You are a brand copywriter. Given a brand name and a brief, write 3 taglines AND a one-line voice descriptor.

Each tagline must:
- Be 8 words or fewer
- Avoid AI buzzwords ("unlock", "leverage", "harness", "robust", "cutting-edge")
- Avoid em dashes
- Sound human

The 3 taglines MUST take DIFFERENT angles:
1. witty — a clever turn of phrase
2. clear — what the product literally does, in plain words
3. aspirational — the outcome / world the user gets

Then write a one-line "voice" descriptor (e.g., "calm, direct, no jargon" or "wry and irreverent").

Respond ONLY with raw JSON (no prose, no markdown):
{
  "taglines": [
    {"tagline": "...", "angle": "witty"},
    {"tagline": "...", "angle": "clear"},
    {"tagline": "...", "angle": "aspirational"}
  ],
  "voice": "..."
}`;

export interface CopywriterArgs {
  name: string;
  brief: string;
  llm: LLMProvider;
  onDelta: (text: string) => void;
}

export async function runCopywriter(args: CopywriterArgs): Promise<CopywriterOutput> {
  let full = "";
  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Brand: ${args.name}\nBrief: ${args.brief}`,
    temperature: 0.8,
    maxTokens: 800,
  })) {
    if (chunk.type === "text_delta") {
      full += chunk.text;
      args.onDelta(chunk.text);
    } else if (chunk.type === "done") {
      full = chunk.fullText || full;
    }
  }
  return CopywriterOutputSchema.parse(JSON.parse(extractJson(full)));
}
