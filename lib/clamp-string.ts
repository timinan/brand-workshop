import { z } from "zod";

/** Trim LLM strings to schema max length so Zod validation does not fail. */
export function clampString(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  if (max <= 1) return t.slice(0, max);
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export const clampedString = (max: number) =>
  z.string().min(1).transform((s) => clampString(s, max));
