"use client";
import { PRESETS } from "@/lib/presets/briefs";
import { PRESET_KITS } from "@/lib/presets/data";
import type { BrandKit } from "@/lib/agents/types";

interface Props {
  onPick: (briefId: string, brief: string, cachedKit: BrandKit | null) => void;
  disabled: boolean;
}

export default function PresetChips({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-sm text-neutral-500">Try:</span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id, p.brief, PRESET_KITS[p.id] ?? null)}
          disabled={disabled}
          className="rounded-full border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 disabled:opacity-50"
          title={p.description}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
