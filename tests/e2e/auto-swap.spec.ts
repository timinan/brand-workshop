import { test, expect } from "@playwright/test";
import { mockWorkshop } from "./mock-server";

test("auto-swap banner appears when emitted", async ({ page }) => {
  await mockWorkshop(page, [
    { type: "workshop_started", brief: "test brief" },
    { type: "agent_started", agent: "namer" },
    { type: "agent_completed", agent: "namer", output: {} },
    { type: "agent_started", agent: "brand-scout" },
    { type: "auto_swap", from: "Acme", to: "Pebble", reason: "trademark conflict" },
    { type: "agent_completed", agent: "brand-scout", output: {} },
  ]);

  await page.goto("/");
  await page.getByPlaceholder(/one sentence/i).fill("test brief");
  await page.getByRole("button", { name: /generate/i }).click();

  const banner = page.getByTestId("auto-swap-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Acme");
  await expect(banner).toContainText("Pebble");
});
