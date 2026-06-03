import { SchemaType } from "@google/generative-ai";
import type { LLMProvider } from "@/lib/providers/types";
import { parseLlmJson } from "@/lib/parse-llm-json";
import { NamerOutputSchema, type NamerOutput } from "./types";

const SYSTEM_PROMPT = `You are a brand naming expert. Given a one-sentence startup brief, generate 3 distinct candidate company names.

Each name must be:
- 1-2 words, 4-14 characters
- Easy to spell and pronounce
- Brandable (not a generic descriptor like "AI Tools Inc")
- Distinct from the other two

For each name, give one sentence of reasoning. Then pick your top recommendation.

Respond ONLY with a single JSON object. In "reasoning" strings use plain words only — no double-quote characters, no apostrophes.`;

export const NAMER_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    candidates: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.STRING },
        },
        required: ["name", "reasoning"],
      },
    },
    top_pick: { type: SchemaType.STRING },
  },
  required: ["candidates", "top_pick"],
};

export { extractJson } from "@/lib/parse-llm-json";

export interface NamerArgs {
  brief: string;
  llm: LLMProvider;
  onDelta: (text: string) => void;
  avoid?: string[];
}

function buildUserPrompt(brief: string, attempt: number, avoid: string[]): string {
  const jsonShape =
    '{"candidates":[{"name":"NameOne","reasoning":"one short sentence"},{"name":"NameTwo","reasoning":"one short sentence"},{"name":"NameThree","reasoning":"one short sentence"}],"top_pick":"NameOne"}';
  const base =
    attempt === 0
      ? `Brief: ${brief}\n\nReturn JSON exactly in this shape (3 candidates, top_pick must match one name):\n${jsonShape}`
      : `Brief: ${brief}\n\nYour previous reply was invalid JSON. Output ONLY raw JSON in this shape with no extra text:\n${jsonShape}`;
  if (avoid.length === 0) return base;
  return `${base}\n\nAlready shown to the user — do NOT repeat any of these: ${avoid.join(", ")}.\nPick three NEW distinct names.`;
}

async function streamNamerResponse(args: NamerArgs, attempt: number): Promise<string> {
  let full = "";
  const avoid = args.avoid ?? [];
  const userPrompt = buildUserPrompt(args.brief, attempt, avoid);
  const temperature = attempt === 0 ? (avoid.length > 0 ? 0.85 : 0.5) : 0.2;

  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature,
    maxTokens: 1024,
    responseSchema: NAMER_RESPONSE_SCHEMA,
  })) {
    if (chunk.type === "text_delta") {
      full += chunk.text;
      args.onDelta(chunk.text);
    } else if (chunk.type === "done") {
      full = chunk.fullText || full;
    }
  }
  return full;
}

export async function runNamer(args: NamerArgs): Promise<NamerOutput> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const full = await streamNamerResponse(args, attempt);
      const parsed = parseLlmJson(full);
      return NamerOutputSchema.parse(parsed);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
