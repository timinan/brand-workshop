import type { LLMProvider, SearchProvider, ImageProvider } from "@/lib/providers/types";
import type { WorkshopEvent } from "@/lib/events/types";
import { runNamer } from "@/lib/agents/namer";
import { runBrandScout } from "@/lib/agents/brand-scout";
import { runDesigner } from "@/lib/agents/designer";
import { runCopywriter } from "@/lib/agents/copywriter";
import { runStrategist } from "@/lib/agents/strategist";
import { synthesizeBrandKit } from "@/lib/agents/director";
import type {
  BrandKit,
  BrandScoutOutput,
  NamerOutput,
} from "@/lib/agents/types";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface NamerPhaseArgs {
  brief: string;
  getLlm: () => LLMProvider;
  emit: (event: WorkshopEvent) => void;
}

export async function runNamerPhase(args: NamerPhaseArgs): Promise<NamerOutput> {
  const { brief, getLlm, emit } = args;
  emit({ type: "workshop_started", brief });

  let llm: LLMProvider;
  try {
    llm = getLlm();
  } catch (err) {
    emit({ type: "workshop_error", error: errorMessage(err) });
    throw err;
  }

  emit({ type: "agent_started", agent: "namer" });
  try {
    const namer = await runNamer({
      brief,
      llm,
      onDelta: (delta) => emit({ type: "agent_streaming", agent: "namer", delta }),
    });
    emit({ type: "agent_completed", agent: "namer", output: namer });
    return namer;
  } catch (err) {
    emit({ type: "workshop_error", agent: "namer", error: errorMessage(err) });
    throw err;
  }
}

export interface BrandScoutPhaseArgs {
  brief: string;
  chosenName: string;
  getLlm: () => LLMProvider;
  getSearch: () => SearchProvider;
  emit: (event: WorkshopEvent) => void;
}

export async function runBrandScoutPhase(args: BrandScoutPhaseArgs): Promise<BrandScoutOutput> {
  const { brief, chosenName, getLlm, getSearch, emit } = args;
  emit({ type: "agent_started", agent: "brand-scout" });
  try {
    const llm = getLlm();
    const search = getSearch();
    const result = await runBrandScout({
      name: chosenName,
      brief,
      llm,
      search,
      onDelta: (delta) => emit({ type: "agent_streaming", agent: "brand-scout", delta }),
      onSearch: (query) => emit({ type: "agent_tool_use", agent: "brand-scout", tool: "web_search", query }),
    });
    const output: BrandScoutOutput = { ...result, vettedName: chosenName };
    emit({ type: "agent_completed", agent: "brand-scout", output });
    return output;
  } catch (err) {
    emit({ type: "workshop_error", agent: "brand-scout", error: errorMessage(err) });
    throw err;
  }
}

export interface FinishPhaseArgs {
  brief: string;
  chosenName: string;
  namerOutput: NamerOutput;
  brandScoutOutput: BrandScoutOutput;
  getLlm: () => LLMProvider;
  getSearch: () => SearchProvider;
  getImage: () => ImageProvider;
  emit: (event: WorkshopEvent) => void;
}

export async function runFinishPhase(args: FinishPhaseArgs): Promise<BrandKit> {
  const { brief, chosenName, namerOutput, brandScoutOutput, getLlm, getSearch, getImage, emit } = args;

  const designerPromise = (async () => {
    emit({ type: "agent_started", agent: "designer" });
    try {
      const image = getImage();
      const out = await runDesigner({
        name: chosenName,
        brief,
        image,
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
      const llm = getLlm();
      const out = await runCopywriter({
        name: chosenName,
        brief,
        llm,
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
      const llm = getLlm();
      const search = getSearch();
      const out = await runStrategist({
        name: chosenName,
        brief,
        llm,
        search,
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

  const brandKit = synthesizeBrandKit({
    brief,
    chosenName,
    namer: namerOutput,
    brandScout: brandScoutOutput,
    designer,
    copywriter,
    strategist,
  });
  emit({ type: "brand_kit_ready", brandKit });
  return brandKit;
}

