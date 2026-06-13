import { describe, it, expect } from "vitest";
import { WorkshopEventSchema } from "@/lib/events/types";

describe("WorkshopEvent", () => {
  it("accepts workshop_started", () => {
    expect(WorkshopEventSchema.safeParse({ type: "workshop_started", brief: "x" }).success).toBe(true);
  });

  it("accepts agent_tool_use", () => {
    expect(
      WorkshopEventSchema.safeParse({
        type: "agent_tool_use", agent: "brand-scout", tool: "web_search", query: "pebble trademark",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown event types", () => {
    expect(WorkshopEventSchema.safeParse({ type: "made_up" }).success).toBe(false);
  });
});

describe("WorkshopEvent — suggest-similar variants", () => {
  it("parses suggest_attempt_started", () => {
    const parsed = WorkshopEventSchema.parse({ type: "suggest_attempt_started", attempt: 1 });
    expect(parsed.type).toBe("suggest_attempt_started");
  });

  it("parses suggest_attempt_named", () => {
    const parsed = WorkshopEventSchema.parse({ type: "suggest_attempt_named", attempt: 2, name: "Pebble" });
    expect(parsed.type).toBe("suggest_attempt_named");
  });

  it("parses suggest_attempt_vetted", () => {
    const parsed = WorkshopEventSchema.parse({
      type: "suggest_attempt_vetted",
      attempt: 1,
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
    });
    expect(parsed.type).toBe("suggest_attempt_vetted");
  });

  it("parses suggest_success with avoidedDuringRun", () => {
    const parsed = WorkshopEventSchema.parse({
      type: "suggest_success",
      name: "Pebble",
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      reasoning: "calm and grounded",
      avoidedDuringRun: ["Stellar"],
    });
    expect(parsed.type).toBe("suggest_success");
    if (parsed.type === "suggest_success") {
      expect(parsed.avoidedDuringRun).toEqual(["Stellar"]);
    }
  });

  it("parses suggest_exhausted with avoidedDuringRun", () => {
    const parsed = WorkshopEventSchema.parse({
      type: "suggest_exhausted",
      name: "PebbleX",
      scorecard: { existingCompany: "fail", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      reasoning: "",
      avoidedDuringRun: ["Stellar", "Stellr", "Stelar"],
    });
    expect(parsed.type).toBe("suggest_exhausted");
  });
});
