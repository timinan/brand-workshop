import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/providers/factory";
import { runNamerPhase } from "@/lib/orchestrator/workshop";
import { encodeSseEvent } from "@/lib/orchestrator/sse";
import type { WorkshopEvent } from "@/lib/events/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { isOverDailyCap, recordRunCost } from "@/lib/cost-cap";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req);
  if (!rl.allowed) {
    return new Response("Rate limit exceeded. Try again later.", { status: 429 });
  }

  if (await isOverDailyCap()) {
    return new Response("Daily live-run budget exhausted. Try a preset, or come back tomorrow.", { status: 429 });
  }
  await recordRunCost();

  const body = (await req.json().catch(() => ({}))) as { brief?: string };
  const brief = (body.brief ?? "").trim();
  if (!brief || brief.length < 4 || brief.length > 280) {
    return new Response("Brief must be between 4 and 280 characters.", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: WorkshopEvent) => controller.enqueue(encodeSseEvent(event));
      try {
        await runNamerPhase({ brief, getLlm: getLLMProvider, emit });
      } catch (err) {
        // runNamerPhase already emitted workshop_error; re-emit only if it didn't.
        if (!(err instanceof Error)) emit({ type: "workshop_error", error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
