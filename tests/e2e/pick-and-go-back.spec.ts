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
  scorecard: { existingCompany: "fail", domain: "warn", trademark: "warn", connotations: "pass" },
  findings: [{ category: "existingCompany", finding: "Exact match exists" }],
  recommendation: "proceed_with_warning",
  vettedName: "Pebble",
} as const;

test("pick a name, see fail scorecard, pick again, see picker with prior candidates", async ({ page }) => {
  await mockEndpoint(page, "/api/workshop/names", [
    { type: "workshop_started", brief: "test brief" },
    { type: "agent_started", agent: "namer" },
    { type: "agent_completed", agent: "namer", output: FAKE_NAMER },
  ] satisfies WorkshopEvent[]);

  await mockEndpoint(page, "/api/workshop/vet", [
    { type: "agent_started", agent: "brand-scout" },
    { type: "agent_completed", agent: "brand-scout", output: FAKE_SCOUT_FAIL },
  ] satisfies WorkshopEvent[]);

  await page.goto("/");
  await page.getByPlaceholder(/one sentence/i).fill("test brief");
  await page.getByRole("button", { name: /generate/i }).click();

  await expect(page.getByTestId("name-picker")).toBeVisible();
  await page.getByTestId("pick-Pebble").click();

  await expect(page.getByTestId("scout-confirm")).toBeVisible();
  await expect(page.getByText(/serious issue/i)).toBeVisible();

  await page.getByTestId("pick-again").click();

  // Picker reappears with both prior candidates still listed.
  await expect(page.getByTestId("name-picker")).toBeVisible();
  await expect(page.getByText("Pebble").first()).toBeVisible();
  await expect(page.getByText("Mosaic")).toBeVisible();
});
