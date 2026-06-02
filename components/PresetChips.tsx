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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-stone-500 mr-1">Try:</span>
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id, p.brief, PRESET_KITS[p.id] ?? null)}
          disabled={disabled}
          className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50 hover:border-stone-400 hover:-translate-y-[1px] transition-all duration-200 disabled:opacity-50 disabled:translate-y-0"
          title={p.description}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
