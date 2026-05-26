import type { AgentName } from "./types";

export interface AgentDescriptor {
  name: AgentName;
  label: string;
  blurb: string;
  stage: 1 | 2 | 3 | 4;
  parallelWith?: AgentName[];
}

export const AGENT_REGISTRY: Record<AgentName, AgentDescriptor> = {
  namer: { name: "namer", label: "Namer", blurb: "Generates candidate brand names", stage: 1 },
  "brand-scout": { name: "brand-scout", label: "Brand Scout", blurb: "Vets the top name against the web", stage: 2 },
  designer: { name: "designer", label: "Designer", blurb: "Generates 3 logo concepts", stage: 3, parallelWith: ["copywriter", "strategist"] },
  copywriter: { name: "copywriter", label: "Copywriter", blurb: "Writes 3 taglines + voice", stage: 3, parallelWith: ["designer", "strategist"] },
  strategist: { name: "strategist", label: "Strategist", blurb: "Positions vs. real competitors", stage: 3, parallelWith: ["designer", "copywriter"] },
  director: { name: "director", label: "Director", blurb: "Assembles the final brand kit", stage: 4 },
};

export const STAGE_3_AGENTS: AgentName[] = ["designer", "copywriter", "strategist"];
