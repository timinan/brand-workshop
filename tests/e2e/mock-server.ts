// Helper to intercept /api/workshop with a scripted SSE stream.
import type { Page } from "@playwright/test";
import type { WorkshopEvent } from "@/lib/events/types";

export async function mockWorkshop(page: Page, events: WorkshopEvent[]) {
  await page.route("**/api/workshop", async (route) => {
    const body = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
      body,
    });
  });
}
