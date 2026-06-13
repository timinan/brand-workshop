import { jsonrepair } from "jsonrepair";

/** Pull a JSON object/array out of model output (markdown fences or prose). */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

/** Best-effort fixes for common LLM JSON mistakes. */
export function repairJsonString(raw: string): string {
  return raw
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

export function parseLlmJson(text: string): unknown {
  const raw = extractJson(text);
  const candidates = [raw, repairJsonString(raw)];
  try {
    candidates.push(jsonrepair(raw));
  } catch {
    /* keep trying */
  }
  try {
    candidates.push(jsonrepair(repairJsonString(raw)));
  } catch {
    /* keep trying */
  }

  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
