import type { AgentName } from "@/lib/agents/types";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import ToolUseChip from "./ToolUseChip";
import AgentPaneDebug from "./AgentPaneDebug";
import type { AgentRuntimeState } from "./Workshop";

interface Props {
  agent: AgentName;
  runtime: AgentRuntimeState;
  debug?: boolean;
}

const STATE_CLASSES: Record<AgentRuntimeState["state"], string> = {
  waiting:    "border-stone-200 bg-stone-50 text-stone-400",
  running:    "border-[#c2410c] bg-white text-stone-900 animate-pulse-subtle",
  "tool-use": "border-[#c2410c] bg-white text-stone-900 animate-pulse-subtle",
  done:       "border-stone-300 border-t-2 border-t-stone-700 bg-white text-stone-900",
  error:      "border-stone-200 border-l-4 border-l-red-700 bg-white text-stone-900",
};

export default function AgentPane({ agent, runtime, debug = false }: Props) {
  const meta = AGENT_REGISTRY[agent];
  const showImageSlots = agent === "designer" && (runtime.state === "running" || runtime.state === "tool-use" || runtime.state === "done");

  return (
    <div
      data-testid={`${agent}-pane`}
      data-state={runtime.state}
      className={`rounded-lg border p-4 transition-colors duration-200 ${STATE_CLASSES[runtime.state]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-stone-950">{meta.label}</h3>
        <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500">{runtime.state}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">{meta.blurb}</p>

      {runtime.toolQueries.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {runtime.toolQueries.map((q, i) => <ToolUseChip key={i} query={q} />)}
        </div>
      )}

      {showImageSlots && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => {
            const img = runtime.images.find((x) => x.index === i);
            return img ? (
              <img key={i} src={img.url} alt="" className="aspect-square w-full rounded border border-stone-200 bg-white object-contain" />
            ) : (
              <div key={i} className="aspect-square w-full rounded border border-stone-200 bg-stone-100" aria-hidden />
            );
          })}
        </div>
      )}

      {runtime.streamedText && (
        <div className="mt-4 border-l border-stone-200 pl-3">
          <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-sans italic text-sm text-stone-600 leading-relaxed">
            {runtime.streamedText.slice(-600)}
          </p>
        </div>
      )}

      {runtime.error && <p className="mt-4 text-sm text-red-900">Error: {runtime.error}</p>}

      {debug && <AgentPaneDebug events={runtime.events} streamedText={runtime.streamedText} />}
    </div>
  );
}
