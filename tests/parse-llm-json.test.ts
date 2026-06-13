import { describe, it, expect } from "vitest";
import { extractJson, parseLlmJson, repairJsonString } from "@/lib/parse-llm-json";

describe("parseLlmJson", () => {
  it("parses fenced JSON", () => {
    const inner = '{"a":1}';
    expect(parseLlmJson("```json\n" + inner + "\n```")).toEqual({ a: 1 });
  });

  it("repairs trailing commas", () => {
    const bad = '{"candidates":[{"name":"A","reasoning":"x"},],"top_pick":"A"}';
    expect(parseLlmJson(bad)).toEqual({
      candidates: [{ name: "A", reasoning: "x" }],
      top_pick: "A",
    });
  });

  it("extractJson is re-exported from namer", async () => {
    const { extractJson: fromNamer } = await import("@/lib/agents/namer");
    expect(fromNamer('{"x":1}')).toBe('{"x":1}');
  });

  it("repairJsonString strips trailing commas", () => {
    expect(repairJsonString('{"a":1,}')).toBe('{"a":1}');
  });

  it("jsonrepair fixes unescaped quotes inside strings", () => {
    const bad =
      '{"candidates":[{"name":"Pebble","reasoning":"Evokes a "fresh" start"}],"top_pick":"Pebble"}';
    const parsed = parseLlmJson(bad) as { top_pick: string };
    expect(parsed.top_pick).toBe("Pebble");
  });
});
