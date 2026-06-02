import { SchemaType } from "@google/generative-ai";
import type { LLMProvider } from "@/lib/providers/types";
import { parseLlmJson } from "@/lib/parse-llm-json";
import { NamerOutputSchema, type NamerOutput } from "./types";

const SYSTEM_PROMPT = `You are a brand naming expert. Given a one-sentence startup brief, generate 3 distinct candidate company names.

Each name must be:
- 1-3 words, max 12 characters total
- Easy to spell and pronounce in English
- Memorable, distinctive, evocative
- Free of generic AI/tech suffixes ("AI", "ly", "ify", "Hub", "GPT")
- Not an obvious collision with a major brand (Google, Apple, Tesla, etc.)

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
}

async function streamNamerResponse(args: NamerArgs, attempt: number): Promise<string> {
  let full = "";
  const jsonShape =
    '{"candidates":[{"name":"NameOne","reasoning":"one short sentence"},{"name":"NameTwo","reasoning":"one short sentence"},{"name":"NameThree","reasoning":"one short sentence"}],"top_pick":"NameOne"}';
  const userPrompt =
    attempt === 0
      ? `Brief: ${args.brief}\n\nReturn JSON exactly in this shape (3 candidates, top_pick must match one name):\n${jsonShape}`
      : `Brief: ${args.brief}\n\nYour previous reply was invalid JSON. Output ONLY raw JSON in this shape with no extra text:\n${jsonShape}`;

  for await (const chunk of args.llm.stream({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    temperature: attempt === 0 ? 0.5 : 0.2,
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
