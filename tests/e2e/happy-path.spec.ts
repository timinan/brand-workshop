import { test, expect } from "@playwright/test";
import { mockPhases } from "./mock-server";
import type { BrandKit } from "@/lib/agents/types";

const FAKE_NAMER = {
  candidates: [
    { name: "Pebble", reasoning: "short" },
    { name: "Mosaic", reasoning: "x" },
  ],
  top_pick: "Pebble",
};

const FAKE_SCOUT = {
  scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [],
  recommendation: "proceed",
  vettedName: "Pebble",
} as const;

const FAKE_KIT: BrandKit = {
  brief: "an AI tool for PMs",
  name: "Pebble",
  autoSwapped: null,
  namesConsidered: [
    { name: "Pebble", reasoning: "short", rejected: false, reason: null },
    { name: "Mosaic", reasoning: "x", rejected: true, reason: "not chosen" },
  ],
  logos: [
    { imageUrl: "https://placehold.co/256x256?text=1", description: "Mark + wordmark", styleTags: ["mark-and-wordmark"] },
    { imageUrl: "https://placehold.co/256x256?text=2", description: "Wordmark only", styleTags: ["wordmark-only"] },
    { imageUrl: "https://placehold.co/256x256?text=3", description: "Abstract symbol", styleTags: ["abstract-symbol"] },
  ],
  taglines: [
    { tagline: "Ship more, debate less", angle: "witty" },
    { tagline: "Plans into products", angle: "clear" },
    { tagline: "Where roadmaps meet reality", angle: "aspirational" },
  ],
  voice: "calm, direct",
  positioning: "For PMs who want to ship faster.",
  competitors: [
    { name: "Notion", url: "https://notion.so", differentiator: "general workspace" },
    { name: "Linear", url: "https://linear.app", differentiator: "issue tracker" },
  ],
  differentiation: "PM-native, not adapted.",
  risk: "Incumbents may copy.",
  scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [],
};

test("happy path: pick a candidate, confirm scorecard, brand kit renders", async ({ page }) => {
  await mockPhases(page, {
    names: [
      { type: "workshop_started", brief: "an AI tool for PMs" },
      { type: "agent_started", agent: "namer" },
      { type: "agent_completed", agent: "namer", output: FAKE_NAMER },
    ],
    vet: [
      { type: "agent_started", agent: "brand-scout" },
      { type: "agent_tool_use", agent: "brand-scout", tool: "web_search", query: "pebble company" },
      { type: "agent_completed", agent: "brand-scout", output: FAKE_SCOUT },
    ],
    finish: [
      { type: "agent_started", agent: "designer" },
      { type: "agent_started", agent: "copywriter" },
      { type: "agent_started", agent: "strategist" },
      { type: "image_generated", conceptIndex: 0, url: "https://placehold.co/256x256?text=1" },
      { type: "image_generated", conceptIndex: 1, url: "https://placehold.co/256x256?text=2" },
      { type: "image_generated", conceptIndex: 2, url: "https://placehold.co/256x256?text=3" },
      { type: "agent_completed", agent: "designer", output: {} },
      { type: "agent_completed", agent: "copywriter", output: {} },
      { type: "agent_completed", agent: "strategist", output: {} },
      { type: "brand_kit_ready", brandKit: FAKE_KIT },
    ],
  });

  await page.goto("/");
  await page.getByPlaceholder(/one sentence/i).fill("an AI tool for PMs");
  await page.getByRole("button", { name: /generate/i }).click();

  // Picker appears with both candidates.
  await expect(page.getByTestId("name-picker")).toBeVisible();
  await expect(page.getByText("Pebble").first()).toBeVisible();
  await expect(page.getByText("Mosaic")).toBeVisible();

  // Pick "Pebble" → confirmation card appears.
  await page.getByTestId("pick-Pebble").click();
  await expect(page.getByTestId("scout-confirm")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pebble" })).toBeVisible();

  // Confirm → brand kit renders.
  await page.getByTestId("confirm-name").click();
  await expect(page.getByTestId("brand-kit")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pebble" })).toBeVisible();
});
