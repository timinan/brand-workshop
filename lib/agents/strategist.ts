import type { LLMProvider, SearchProvider, SearchResult } from "@/lib/providers/types";
import { StrategistOutputSchema, type StrategistOutput } from "./types";
import { parseLlmJson } from "@/lib/parse-llm-json";

const SYSTEM_PROMPT = `You are a product strategist. Given a brand name, a brief, and competitive search results, produce a positioning statement, 2-3 real competitors, a differentiation sentence, and one strategic risk.

You MUST use real competitors that appeared in the search results. Do NOT invent competitors. Each competitor needs a real URL.

Keep every string concise (hard limits):
- positioning: max 400 characters (2-3 short sentences)
- differentiation: max 280 characters (1 sentence)
- risk: max 280 characters (1 sentence)
- differentiator: max 160 characters each

Respond ONLY with raw JSON (no prose, no markdown):
{
  "positioning": "<1-3 sentences>",
  "competitors": [
    {"name": "...", "url": "https://...", "differentiator": "..."},
    {"name": "...", "url": "https://...", "differentiator": "..."}
  ],
  "differentiation": "<1 sentence>",
  "risk": "<1 sentence>"
}`;

function format(results: SearchResult[]): string {
  return results.slice(0, 5).map((r, i) => `${i + 1}. ${r.title} (${r.url}) — ${r.snippet}`).join("\n");
}

export interface StrategistArgs {
  name: string;
  brief: string;
  llm: LLMProvider;
  search: SearchProvider;
  onDelta: (text: string) => void;
  onSearch: (query: string) => void;
}

export async function runStrategist(args: StrategistArgs): Promise<StrategistOutput> {
  const query = `${args.brief} competitors`;
  args.onSearch(query);
  const results = await args.search.search(query, { maxResults: 5 });

  const userPrompt = `Brand: ${args.name}
Brief: ${args.brief}

Competitive search results for "${query}":
${format(results)}

Produce the JSON.`;

  let full = "";
  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.4,
    maxTokens: 1024,
  })) {
    if (chunk.type === "text_delta") {
      full += chunk.text;
      args.onDelta(chunk.text);
    } else if (chunk.type === "done") {
      full = chunk.fullText || full;
    }
  }
  return StrategistOutputSchema.parse(parseLlmJson(full));
}
