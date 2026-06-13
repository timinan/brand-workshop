import { z } from "zod";
import { AgentNameSchema, BrandKitSchema, ScorecardSchema, FindingSchema } from "@/lib/agents/types";

export const WorkshopEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("workshop_started"), brief: z.string() }),
  z.object({ type: z.literal("agent_started"), agent: AgentNameSchema }),
  z.object({ type: z.literal("agent_streaming"), agent: AgentNameSchema, delta: z.string() }),
  z.object({ type: z.literal("agent_tool_use"), agent: AgentNameSchema, tool: z.string(), query: z.string() }),
  z.object({ type: z.literal("agent_completed"), agent: AgentNameSchema, output: z.unknown() }),
  z.object({ type: z.literal("image_generated"), conceptIndex: z.number().int().min(0), url: z.string().url() }),
  z.object({ type: z.literal("brand_kit_ready"), brandKit: BrandKitSchema }),
  z.object({ type: z.literal("workshop_error"), agent: AgentNameSchema.optional(), error: z.string() }),
  z.object({ type: z.literal("suggest_attempt_started"), attempt: z.number().int().min(1).max(3) }),
  z.object({ type: z.literal("suggest_attempt_named"), attempt: z.number().int().min(1).max(3), name: z.string().min(1).max(60) }),
  z.object({ type: z.literal("suggest_attempt_vetted"), attempt: z.number().int().min(1).max(3), scorecard: ScorecardSchema }),
  z.object({
    type: z.literal("suggest_success"),
    name: z.string().min(1).max(60),
    scorecard: ScorecardSchema,
    findings: z.array(FindingSchema),
    reasoning: z.string(),
    avoidedDuringRun: z.array(z.string().min(1).max(60)).max(10),
  }),
  z.object({
    type: z.literal("suggest_exhausted"),
    name: z.string().min(1).max(60),
    scorecard: ScorecardSchema,
    findings: z.array(FindingSchema),
    reasoning: z.string(),
    avoidedDuringRun: z.array(z.string().min(1).max(60)).max(10),
  }),
]);

export type WorkshopEvent = z.infer<typeof WorkshopEventSchema>;
