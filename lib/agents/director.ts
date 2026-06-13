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
  chosenName: string;
  namer: NamerOutput;
  brandScout: BrandScoutOutput;
  designer: DesignerOutput;
  copywriter: CopywriterOutput;
  strategist: StrategistOutput;
}

export function synthesizeBrandKit(args: SynthesizeArgs): BrandKit {
  const kit: BrandKit = {
    brief: args.brief,
    name: args.chosenName,
    autoSwapped: null,
    namesConsidered: args.namer.candidates.map((c) => ({
      name: c.name,
      reasoning: c.reasoning,
      rejected: c.name !== args.chosenName,
      reason: c.name !== args.chosenName ? "not chosen" : null,
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
