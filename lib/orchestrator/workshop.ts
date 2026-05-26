import type { LLMProvider, SearchProvider, ImageProvider } from "@/lib/providers/types";
import type { WorkshopEvent } from "@/lib/events/types";
import { runNamer } from "@/lib/agents/namer";
import { runBrandScout } from "@/lib/agents/brand-scout";
import { runDesigner } from "@/lib/agents/designer";
import { runCopywriter } from "@/lib/agents/copywriter";
import { runStrategist } from "@/lib/agents/strategist";
import { synthesizeBrandKit } from "@/lib/agents/director";
import type { BrandScoutOutput, NamerOutput } from "@/lib/agents/types";

export interface WorkshopArgs {
  brief: string;
  llm: LLMProvider;
  search: SearchProvider;
  image: ImageProvider;
  emit: (event: WorkshopEvent) => void;
}

const MAX_SCOUT_ATTEMPTS = 3;

export async function runWorkshop(args: WorkshopArgs): Promise<void> {
  const { brief, llm, search, image, emit } = args;
  emit({ type: "workshop_started", brief });

  // Stage 1: Namer
  let namer: NamerOutput;
  emit({ type: "agent_started", agent: "namer" });
  try {
    namer = await runNamer({
      brief, llm,
      onDelta: (delta) => emit({ type: "agent_streaming", agent: "namer", delta }),
    });
    emit({ type: "agent_completed", agent: "namer", output: namer });
  } catch (err) {
    emit({ type: "workshop_error", agent: "namer", error: errorMessage(err) });
    return; // Fatal — nothing downstream is possible.
  }

  // Stage 2: Brand Scout, up to 3 attempts with auto-swap.
  let scout: BrandScoutOutput | null = null;
  let chosenName = namer.top_pick;
  const tried: string[] = [];

  for (let attempt = 0; attempt < MAX_SCOUT_ATTEMPTS && attempt < namer.candidates.length; attempt++) {
    tried.push(chosenName);
    emit({ type: "agent_started", agent: "brand-scout" });
    try {
      const result = await runBrandScout({
        name: chosenName, brief, llm, search,
        onDelta: (delta) => emit({ type: "agent_streaming", agent: "brand-scout", delta }),
        onSearch: (query) => emit({ type: "agent_tool_use", agent: "brand-scout", tool: "web_search", query }),
      });

      if (result.recommendation === "swap_to_next") {
        const nextCandidate = namer.candidates.find((c) => !tried.includes(c.name));
        if (!nextCandidate) {
          // All candidates failed: use the original top pick and surface findings.
          scout = { ...result, vettedName: namer.top_pick, recommendation: "proceed_with_warning" };
          emit({ type: "agent_completed", agent: "brand-scout", output: scout });
          break;
        }
        emit({
          type: "auto_swap",
          from: chosenName,
          to: nextCandidate.name,
          reason: result.findings[0]?.finding ?? "scorecard failure",
        });
        chosenName = nextCandidate.name;
        continue;
      }

      scout = result;
      emit({ type: "agent_completed", agent: "brand-scout", output: scout });
      break;
    } catch (err) {
      // Search/LLM failure: keep going with original name + warning.
      scout = {
        scorecard: { existingCompany: "warn", domain: "warn", trademark: "warn", connotations: "warn" },
        findings: [{ category: "system", finding: `Brand Scout unavailable: ${errorMessage(err)}` }],
        recommendation: "proceed_with_warning",
        vettedName: namer.top_pick,
      };
      emit({ type: "agent_completed", agent: "brand-scout", output: scout });
      break;
    }
  }

  if (!scout) {
    // Loop exited without setting scout (shouldn't happen but safety net).
    scout = {
      scorecard: { existingCompany: "warn", domain: "warn", trademark: "warn", connotations: "warn" },
      findings: [{ category: "system", finding: "Brand Scout produced no result" }],
      recommendation: "proceed_with_warning",
      vettedName: namer.top_pick,
    };
  }

  const vettedName = scout.vettedName;

  // Stage 3: parallel Designer + Copywriter + Strategist
  const designerPromise = (async () => {
    emit({ type: "agent_started", agent: "designer" });
    try {
      const out = await runDesigner({
        name: vettedName, brief, image,
        onImage: (i, url) => emit({ type: "image_generated", conceptIndex: i, url }),
      });
      emit({ type: "agent_completed", agent: "designer", output: out });
      return out;
    } catch (err) {
      emit({ type: "workshop_error", agent: "designer", error: errorMessage(err) });
      throw err;
    }
  })();

  const copyPromise = (async () => {
    emit({ type: "agent_started", agent: "copywriter" });
    try {
      const out = await runCopywriter({
        name: vettedName, brief, llm,
        onDelta: (delta) => emit({ type: "agent_streaming", agent: "copywriter", delta }),
      });
      emit({ type: "agent_completed", agent: "copywriter", output: out });
      return out;
    } catch (err) {
      emit({ type: "workshop_error", agent: "copywriter", error: errorMessage(err) });
      throw err;
    }
  })();

  const strategistPromise = (async () => {
    emit({ type: "agent_started", agent: "strategist" });
    try {
      const out = await runStrategist({
        name: vettedName, brief, llm, search,
        onDelta: (delta) => emit({ type: "agent_streaming", agent: "strategist", delta }),
        onSearch: (query) => emit({ type: "agent_tool_use", agent: "strategist", tool: "web_search", query }),
      });
      emit({ type: "agent_completed", agent: "strategist", output: out });
      return out;
    } catch (err) {
      emit({ type: "workshop_error", agent: "strategist", error: errorMessage(err) });
      throw err;
    }
  })();

  const [designer, copywriter, strategist] = await Promise.all([designerPromise, copyPromise, strategistPromise]);

  // Stage 4: Director (deterministic) — no agent_started/agent_completed; signal is brand_kit_ready.
  const brandKit = synthesizeBrandKit({ brief, namer, brandScout: scout, designer, copywriter, strategist });
  emit({ type: "brand_kit_ready", brandKit });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
