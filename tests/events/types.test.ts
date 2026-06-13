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
