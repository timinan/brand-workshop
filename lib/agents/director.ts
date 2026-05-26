import {
  BrandKitSchema,
  type BrandKit,
  type NamerOutput,
  type BrandScoutOutput,
  type DesignerOutput,
  type CopywriterOutput,
  type StrategistOutput,
} from "./types";

export interface SynthesizeArgs {
  brief: string;
  namer: NamerOutput;
  brandScout: BrandScoutOutput;
  designer: DesignerOutput;
  copywriter: CopywriterOutput;
  strategist: StrategistOutput;
}

function reasonForAutoSwap(scout: BrandScoutOutput): string {
  const fails = (Object.entries(scout.scorecard) as [string, "pass" | "warn" | "fail"][])
    .filter(([, v]) => v === "fail")
    .map(([k]) => k);
  if (fails.length > 0) return `${fails.join(", ")} verdict failed`;
  const firstFinding = scout.findings[0];
  return firstFinding ? firstFinding.finding : "brand-scout chose to swap";
}

export function synthesizeBrandKit(args: SynthesizeArgs): BrandKit {
  const vettedName = args.brandScout.vettedName;
  const swapped = vettedName !== args.namer.top_pick;

  const kit: BrandKit = {
    brief: args.brief,
    name: vettedName,
    autoSwapped: swapped
      ? { from: args.namer.top_pick, to: vettedName, reason: reasonForAutoSwap(args.brandScout) }
      : null,
    namesConsidered: args.namer.candidates.map((c) => ({
      name: c.name,
      reasoning: c.reasoning,
      rejected: c.name !== vettedName,
      reason: c.name !== vettedName ? (swapped && c.name === args.namer.top_pick ? "rejected by Brand Scout" : "not top pick") : null,
    })),
    logos: args.designer.concepts,
    taglines: args.copywriter.taglines,
    voice: args.copywriter.voice,
    positioning: args.strategist.positioning,
    competitors: args.strategist.competitors,
    differentiation: args.strategist.differentiation,
    risk: args.strategist.risk,
    scorecard: args.brandScout.scorecard,
    findings: args.brandScout.findings,
  };

  return BrandKitSchema.parse(kit);
}
