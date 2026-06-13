// Helpers to intercept the three SSE phase endpoints with scripted streams.
import type { Page } from "@playwright/test";
import type { WorkshopEvent } from "@/lib/events/types";

function eventBody(events: WorkshopEvent[]): string {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

export async function mockEndpoint(page: Page, url: string, events: WorkshopEvent[]) {
  await page.route(`**${url}`, async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
      body: eventBody(events),
    });
  });
}

export interface MockPhasesArgs {
  names: WorkshopEvent[];
  vet: WorkshopEvent[];
  finish: WorkshopEvent[];
}

export async function mockPhases(page: Page, args: MockPhasesArgs) {
  await mockEndpoint(page, "/api/workshop/names", args.names);
  await mockEndpoint(page, "/api/workshop/vet", args.vet);
  await mockEndpoint(page, "/api/workshop/finish", args.finish);
}
