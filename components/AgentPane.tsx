import type { AgentName } from "@/lib/agents/types";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import ToolUseChip from "./ToolUseChip";
import type { AgentRuntimeState } from "./Workshop";

interface Props {
  agent: AgentName;
  runtime: AgentRuntimeState;
}

const STATE_CLASSES: Record<AgentRuntimeState["state"], string> = {
  waiting: "border-neutral-200 bg-neutral-50 text-neutral-400",
  running: "border-blue-400 bg-white text-neutral-900 animate-pulse-subtle",
  "tool-use": "border-blue-500 bg-white text-neutral-900",
  done: "border-emerald-400 bg-white text-neutral-900",
  error: "border-red-400 bg-red-50 text-red-700",
};

export default function AgentPane({ agent, runtime }: Props) {
  const meta = AGENT_REGISTRY[agent];
  return (
    <div
      data-testid={`${agent}-pane`}
      data-state={runtime.state}
      className={`rounded-lg border p-4 transition-colors ${STATE_CLASSES[runtime.state]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg">{meta.label}</h3>
        <span className="text-xs uppercase tracking-wide text-neutral-500">{runtime.state}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{meta.blurb}</p>

      {runtime.toolQueries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {runtime.toolQueries.map((q, i) => <ToolUseChip key={i} query={q} />)}
        </div>
      )}

      {runtime.images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {runtime.images
            .slice()
            .sort((a, b) => a.index - b.index)
            .map((img) => (
              <img key={img.index} src={img.url} alt="" className="aspect-square w-full rounded border bg-white object-contain" />
            ))}
        </div>
      )}

      {runtime.streamedText && (
        <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-50 p-2 text-xs text-neutral-700">
          {runtime.streamedText.slice(-600)}
        </pre>
      )}

      {runtime.error && <p className="mt-2 text-sm text-red-700">Error: {runtime.error}</p>}
    </div>
  );
}
