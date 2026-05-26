import type { WorkshopEvent } from "@/lib/events/types";

export function encodeSseEvent(event: WorkshopEvent): Uint8Array {
  const json = JSON.stringify(event);
  const payload = `event: ${event.type}\ndata: ${json}\n\n`;
  return new TextEncoder().encode(payload);
}
