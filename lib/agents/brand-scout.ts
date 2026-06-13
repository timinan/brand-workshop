import type { LLMProvider, SearchProvider, SearchResult } from "@/lib/providers/types";
import { BrandScoutOutputSchema, type BrandScoutOutput } from "./types";
import { parseLlmJson } from "@/lib/parse-llm-json";

const SYSTEM_PROMPT = `You are a brand safety analyst. Given a candidate brand name, a brief, and web search findings, produce a Brand Safety Scorecard.

For each of these dimensions, give a verdict ("pass" | "warn" | "fail"):
- existingCompany: another well-known company already using this exact name
- domain: signals about ".com" availability (heuristic, from web search only)
- trademark: signs of an active trademark filing or conflict
- connotations: negative meanings in English, Spanish, French, or Mandarin

Provide specific findings (one per surfaced issue). Then recommend ONE of:
- "proceed" — clean across the board
- "proceed_with_warning" — minor warnings, still usable
- "swap_to_next" — at least one "fail" verdict

Respond ONLY with raw JSON (no prose, no markdown):
{
  "scorecard": { "existingCompany": "...", "domain": "...", "trademark": "...", "connotations": "..." },
  "findings": [{"category": "...", "finding": "..."}],
  "recommendation": "...",
  "vettedName": "<the name you were asked about>"
}`;

const QUERIES = (name: string) => [
  `"${name}" company`,
  `${name}.com`,
  `${name} trademark`,
  `${name} meaning negative connotation`,
];

function formatResults(query: string, results: SearchResult[]): string {
  if (results.length === 0) return `Q: ${query}\n(no results)`;
  return (
    `Q: ${query}\n` +
    results
      .slice(0, 3)
      .map((r, i) => `  ${i + 1}. ${r.title} — ${r.url}\n     ${r.snippet}`)
      .join("\n")
  );
}

export interface BrandScoutArgs {
  name: string;
  brief: string;
  llm: LLMProvider;
  search: SearchProvider;
  onDelta: (text: string) => void;
  onSearch: (query: string) => void;
}

export async function runBrandScout(args: BrandScoutArgs): Promise<BrandScoutOutput> {
  const queries = QUERIES(args.name);
  const searchFindings: string[] = [];

  for (const q of queries) {
    args.onSearch(q);
    const results = await args.search.search(q, { maxResults: 3 });
    searchFindings.push(formatResults(q, results));
  }

  const userPrompt = `Brand candidate: ${args.name}
Brief: ${args.brief}

Search findings:
${searchFindings.join("\n\n")}

Produce the scorecard JSON.`;

  let full = "";
  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,
    maxTokens: 1024,
  })) {
    if (chunk.type === "text_delta") {
      full += chunk.text;
      args.onDelta(chunk.text);
    } else if (chunk.type === "done") {
      full = chunk.fullText || full;
    }
  }

  const parsed = BrandScoutOutputSchema.parse(parseLlmJson(full));

  // Enforce: any "fail" verdict overrides recommendation to swap_to_next.
  const hasFail = Object.values(parsed.scorecard).includes("fail");
  if (hasFail && parsed.recommendation !== "swap_to_next") {
    return { ...parsed, recommendation: "swap_to_next" };
  }
  return { ...parsed, vettedName: args.name };
}
