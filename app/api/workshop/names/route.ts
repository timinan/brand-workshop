import { NextRequest } from "next/server";
import { getLLMProvider } from "@/lib/providers/factory";
import { runNamerPhase } from "@/lib/orchestrator/workshop";
import { encodeSseEvent } from "@/lib/orchestrator/sse";
import type { WorkshopEvent } from "@/lib/events/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { isOverDailyCap, recordRunCost } from "@/lib/cost-cap";

export const runtime = "edge";

function validateAvoid(value: unknown): string[] | { error: string } {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return { error: "avoid must be an array of strings." };
  if (value.length > 30) return { error: "avoid must contain at most 30 names." };
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return { error: "avoid items must be strings." };
    const trimmed = item.trim();
    if (trimmed.length === 0 || trimmed.length > 60) {
      return { error: "avoid items must be 1-60 characters." };
    }
    out.push(trimmed);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req);
  if (!rl.allowed) {
    return new Response("Rate limit exceeded. Try again later.", { status: 429 });
  }

  if (await isOverDailyCap()) {
    return new Response("Daily live-run budget exhausted. Try a preset, or come back tomorrow.", { status: 429 });
  }
  await recordRunCost();

  const body = (await req.json().catch(() => ({}))) as { brief?: string; avoid?: unknown };
  const brief = (body.brief ?? "").trim();
  if (!brief || brief.length < 4 || brief.length > 280) {
    return new Response("Brief must be between 4 and 280 characters.", { status: 400 });
  }

  const avoidResult = validateAvoid(body.avoid);
  if ("error" in avoidResult) {
    return new Response(avoidResult.error, { status: 400 });
  }
  const avoid = avoidResult;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: WorkshopEvent) => controller.enqueue(encodeSseEvent(event));
      try {
        await runNamerPhase({ brief, avoid, getLlm: getLLMProvider, emit });
      } catch (err) {
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
