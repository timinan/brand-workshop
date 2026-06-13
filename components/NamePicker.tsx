"use client";
import { useState } from "react";
import type { NamerOutput } from "@/lib/agents/types";

interface Props {
  candidates: NamerOutput;
  onPick: (name: string) => void;
  onRegenerate: () => void;
  onCustomName: (name: string) => void;
  disabled?: boolean;
}

export default function NamePicker({ candidates, onPick, onRegenerate, onCustomName, disabled = false }: Props) {
  const [custom, setCustom] = useState("");

  function submitCustom() {
    const v = custom.trim();
    if (!v || v.length > 60) return;
    onCustomName(v);
  }

  return (
    <section
      data-testid="name-picker"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6 animate-slide-up"
    >
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Pick a name</h3>

      <ul className="space-y-4">
        {candidates.candidates.map((c) => (
          <li
            key={c.name}
            className="flex items-baseline justify-between gap-4 border-b border-stone-100 pb-4 last:border-b-0 last:pb-0"
          >
            <div className="space-y-1">
              <p className="font-display text-3xl text-stone-950">
                {c.name}
                {c.name === candidates.top_pick && (
                  <span className="font-display-italic text-[#c2410c] text-base ml-2">recommended</span>
                )}
              </p>
              <p className="text-sm text-stone-700">{c.reasoning}</p>
            </div>
            <button
              type="button"
              onClick={() => onPick(c.name)}
              disabled={disabled}
              className="rounded bg-[#c2410c] px-4 py-2 text-sm font-medium text-white hover:bg-[#9a3412] disabled:opacity-50 transition-colors duration-200 shrink-0"
              data-testid={`pick-${c.name}`}
            >
              Use this name
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-6 border-t border-stone-200 space-y-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled}
          className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-stone-50 disabled:opacity-50 transition-colors duration-200"
          data-testid="regenerate-names"
        >
          Show me more options
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCustom();
            }}
            placeholder="Or use your own name"
            disabled={disabled}
            maxLength={60}
            className="flex-1 rounded border border-stone-300 bg-white px-4 py-2 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-[#c2410c]/30 disabled:opacity-50"
            data-testid="custom-name-input"
          />
          <button
            type="button"
            onClick={submitCustom}
            disabled={disabled || custom.trim().length === 0}
            className="rounded bg-[#c2410c] px-4 py-2 text-sm font-medium text-white hover:bg-[#9a3412] disabled:opacity-50 transition-colors duration-200"
            data-testid="submit-custom-name"
          >
            Use this name
          </button>
        </div>
      </div>
    </section>
  );
}
