export interface PresetBrief {
  id: string;
  label: string;
  brief: string;
  description: string;
  triggersAutoSwap: boolean;
}

export const PRESETS: PresetBrief[] = [
  {
    id: "pm-ai",
    label: "AI tool for PMs",
    brief: "an AI tool that helps product managers ship faster",
    description: "Clean run, no auto-swap.",
    triggersAutoSwap: false,
  },
  {
    id: "stablecoin",
    label: "Stablecoin for creators",
    brief: "a stablecoin built for digital creators to get paid instantly",
    description: "Triggers an auto-swap on the first name.",
    triggersAutoSwap: true,
  },
  {
    id: "espresso",
    label: "At-home espresso",
    brief: "an at-home espresso machine that pulls cafe-grade shots in 30 seconds",
    description: "Shows logo concepts shine on physical-product briefs.",
    triggersAutoSwap: false,
  },
];
