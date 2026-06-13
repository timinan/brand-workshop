import { test, expect } from "@playwright/test";
import { mockEndpoint } from "./mock-server";
import type { WorkshopEvent } from "@/lib/events/types";

const FAKE_NAMER = {
  candidates: [
    { name: "Pebble", reasoning: "short" },
    { name: "Mosaic", reasoning: "alt" },
  ],
  top_pick: "Pebble",
};

const FAKE_SCOUT_FAIL = {
  scorecard: { existingCompany: "fail", domain: "pass", trademark: "pass", connotations: "pass" },
  findings: [{ category: "existingCompany", finding: "Pebble Inc exists" }],
  recommendation: "swap_to_next",
  vettedName: "Pebble",
} as const;

test("suggest similar: passes on first attempt, replaces name + scorecard", async ({ page }) => {
  await mockEndpoint(page, "/api/workshop/names", [
    { type: "workshop_started", brief: "test brief" },
    { type: "agent_started", agent: "namer" },
    { type: "agent_completed", agent: "namer", output: FAKE_NAMER },
  ] satisfies WorkshopEvent[]);

  await mockEndpoint(page, "/api/workshop/vet", [
    { type: "agent_started", agent: "brand-scout" },
    { type: "agent_completed", agent: "brand-scout", output: FAKE_SCOUT_FAIL },
  ] satisfies WorkshopEvent[]);

  await mockEndpoint(page, "/api/workshop/suggest-similar", [
    { type: "suggest_attempt_started", attempt: 1 },
    { type: "suggest_attempt_named", attempt: 1, name: "Cobbl" },
    { type: "suggest_attempt_vetted", attempt: 1, scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" } },
    {
      type: "suggest_success",
      name: "Cobbl",
      scorecard: { existingCompany: "pass", domain: "pass", trademark: "pass", connotations: "pass" },
      findings: [],
      reasoning: "softer variant of Pebble",
      avoidedDuringRun: [],
    },
  ] satisfies WorkshopEvent[]);

  await page.goto("/");
  await page.getByPlaceholder(/one sentence/i).fill("test brief");
  await page.getByRole("button", { name: /generate/i }).click();

  await expect(page.getByTestId("name-picker")).toBeVisible();
  await page.getByTestId("pick-Pebble").click();

  // ScoutConfirm with failing scorecard
  await expect(page.getByTestId("scout-confirm")).toBeVisible();
  await expect(page.getByTestId("scout-confirm")).toContainText("Pebble");
  await expect(page.getByTestId("suggest-similar")).toBeVisible();

  // Click "Suggest similar"
  await page.getByTestId("suggest-similar").click();

  // After success, the displayed name updates to "Cobbl"
  await expect(page.getByTestId("scout-confirm")).toContainText("Cobbl");

  // The suggest-similar button disappears because the new scorecard passes
  await expect(page.getByTestId("suggest-similar")).toHaveCount(0);

  // Findings list is cleared (new scorecard has no findings)
  await expect(page.getByText(/Pebble Inc exists/i)).toHaveCount(0);
});

test("suggest similar: exhausts after 3 attempts, surfaces last name + caption", async ({ page }) => {
  await mockEndpoint(page, "/api/workshop/names", [
    { type: "workshop_started", brief: "test brief" },
    { type: "agent_started", agent: "namer" },
    { type: "agent_completed", agent: "namer", output: FAKE_NAMER },
  ] satisfies WorkshopEvent[]);

  await mockEndpoint(page, "/api/workshop/vet", [
    { type: "agent_started", agent: "brand-scout" },
    { type: "agent_completed", agent: "brand-scout", output: FAKE_SCOUT_FAIL },
  ] satisfies WorkshopEvent[]);

  const failingSc = { existingCompany: "fail", domain: "pass", trademark: "pass", connotations: "pass" } as const;

  await mockEndpoint(page, "/api/workshop/suggest-similar", [
    { type: "suggest_attempt_started", attempt: 1 },
    { type: "suggest_attempt_named", attempt: 1, name: "Pebbl" },
    { type: "suggest_attempt_vetted", attempt: 1, scorecard: failingSc },
    { type: "suggest_attempt_started", attempt: 2 },
    { type: "suggest_attempt_named", attempt: 2, name: "Pebblo" },
    { type: "suggest_attempt_vetted", attempt: 2, scorecard: failingSc },
    { type: "suggest_attempt_started", attempt: 3 },
    { type: "suggest_attempt_named", attempt: 3, name: "Pebbley" },
    { type: "suggest_attempt_vetted", attempt: 3, scorecard: failingSc },
    {
      type: "suggest_exhausted",
      name: "Pebbley",
      scorecard: failingSc,
      findings: [{ category: "existingCompany", finding: "still close to Pebble Inc" }],
      reasoning: "all attempts too close to the rejected name",
      avoidedDuringRun: ["Pebbl", "Pebblo"],
    },
  ] satisfies WorkshopEvent[]);

  await page.goto("/");
  await page.getByPlaceholder(/one sentence/i).fill("test brief");
  await page.getByRole("button", { name: /generate/i }).click();
  await page.getByTestId("pick-Pebble").click();

  // Fails first
  await expect(page.getByTestId("scout-confirm")).toContainText("Pebble");

  // Click suggest similar
  await page.getByTestId("suggest-similar").click();

  // After exhaustion: surfaces the last attempt's name
  await expect(page.getByTestId("scout-confirm")).toContainText("Pebbley");
  // And shows the exhausted caption
  await expect(page.getByTestId("suggest-exhausted")).toBeVisible();
  await expect(page.getByTestId("suggest-exhausted")).toContainText(/3 tries/);
});
