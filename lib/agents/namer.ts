import type { LLMProvider } from "@/lib/providers/types";
import { NamerOutputSchema, type NamerOutput } from "./types";

const SYSTEM_PROMPT = `You are a brand naming expert. Given a one-sentence startup brief, generate 3 distinct candidate company names.

Each name must be:
- 1-3 words, max 12 characters total
- Easy to spell and pronounce in English
- Memorable, distinctive, evocative
- Free of generic AI/tech suffixes ("AI", "ly", "ify", "Hub", "GPT")
- Not an obvious collision with a major brand (Google, Apple, Tesla, etc.)

For each name, give one sentence of reasoning. Then pick your top recommendation.

Respond ONLY with raw JSON, no prose, no markdown:
{
  "candidates": [
    {"name": "string", "reasoning": "string"},
    {"name": "string", "reasoning": "string"},
    {"name": "string", "reasoning": "string"}
  ],
  "top_pick": "string"
}`;

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

export interface NamerArgs {
  brief: string;
  llm: LLMProvider;
  onDelta: (text: string) => void;
}

export async function runNamer(args: NamerArgs): Promise<NamerOutput> {
  let full = "";
  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Brief: ${args.brief}`,
    temperature: 0.9,
    maxTokens: 1024,
  })) {
    if (chunk.type === "text_delta") {
      full += chunk.text;
      args.onDelta(chunk.text);
    } else if (chunk.type === "done") {
      full = chunk.fullText || full;
    }
  }
  const raw = extractJson(full);
  const parsed = JSON.parse(raw);
  return NamerOutputSchema.parse(parsed);
}
