import { z } from "zod";
import { clampedString } from "@/lib/clamp-string";

export const VerdictSchema = z.enum(["pass", "warn", "fail"]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const AgentNameSchema = z.enum([
  "namer", "brand-scout", "designer", "copywriter", "strategist", "director",
]);
export type AgentName = z.infer<typeof AgentNameSchema>;

export const NamerCandidateSchema = z.object({
  name: z.string().min(1).max(24),
  reasoning: z.string().min(1).max(200),
});

export const NamerOutputSchema = z
  .object({
    candidates: z.array(NamerCandidateSchema).min(2).max(5),
    top_pick: z.string().min(1),
  })
  .refine((v) => v.candidates.some((c) => c.name === v.top_pick), {
    message: "top_pick must match one of the candidate names",
    path: ["top_pick"],
  });
export type NamerOutput = z.infer<typeof NamerOutputSchema>;

export const ScorecardSchema = z.object({
  existingCompany: VerdictSchema,
  domain: VerdictSchema,
  trademark: VerdictSchema,
  connotations: VerdictSchema,
});

export const FindingSchema = z.object({
  category: z.string(),
  finding: z.string(),
});

export const BrandScoutOutputSchema = z.object({
  scorecard: ScorecardSchema,
  findings: z.array(FindingSchema),
  recommendation: z.enum(["proceed", "proceed_with_warning", "swap_to_next"]),
  vettedName: z.string().min(1),
});
export type BrandScoutOutput = z.infer<typeof BrandScoutOutputSchema>;

export const LogoConceptSchema = z.object({
  imageUrl: z.string().url(),
  description: z.string().min(1).max(160),
  styleTags: z.array(z.string()).min(1),
});

export const DesignerOutputSchema = z.object({
  concepts: z.array(LogoConceptSchema).length(3),
});
export type DesignerOutput = z.infer<typeof DesignerOutputSchema>;

export const TaglineSchema = z.object({
  tagline: z
    .string()
    .min(1)
    .refine((s) => s.trim().split(/\s+/).length <= 8, {
      message: "tagline must be 8 words or fewer",
    }),
  angle: z.enum(["witty", "clear", "aspirational"]),
});

export const CopywriterOutputSchema = z.object({
  taglines: z.array(TaglineSchema).length(3),
  voice: z.string().min(1).max(140),
});
export type CopywriterOutput = z.infer<typeof CopywriterOutputSchema>;

export const CompetitorSchema = z.object({
  name: clampedString(80),
  url: z.string().url(),
  differentiator: clampedString(160),
});

export const StrategistOutputSchema = z.object({
  positioning: clampedString(400),
  competitors: z.array(CompetitorSchema).min(2).max(3),
  differentiation: clampedString(280),
  risk: clampedString(280),
});
export type StrategistOutput = z.infer<typeof StrategistOutputSchema>;

export const NameConsideredSchema = z.object({
  name: z.string().min(1),
  reasoning: z.string().min(1),
  rejected: z.boolean(),
  reason: z.string().nullable(),
});

export const AutoSwapInfoSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  reason: z.string().min(1),
});

export const BrandKitSchema = z.object({
  brief: z.string(),
  name: z.string(),
  autoSwapped: AutoSwapInfoSchema.nullable(),
  namesConsidered: z.array(NameConsideredSchema),
  logos: z.array(LogoConceptSchema).length(3),
  taglines: z.array(TaglineSchema).length(3),
  voice: z.string(),
  positioning: z.string(),
  competitors: z.array(CompetitorSchema),
  differentiation: z.string(),
  risk: z.string(),
  scorecard: ScorecardSchema,
  findings: z.array(FindingSchema),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;
