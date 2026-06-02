"use client";

interface Props {
  brief: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  disabled: boolean;
}

export default function BriefInput({ brief, onChange, onGenerate, disabled }: Props) {
  return (
    <div className="flex gap-2">
      <input
        className="flex-1 rounded border border-stone-300 bg-white px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#c2410c] focus:ring-2 focus:ring-[#c2410c]/30"
        placeholder="One sentence: an AI tool for product managers"
        value={brief}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled && brief.length >= 4) onGenerate();
        }}
        disabled={disabled}
      />
      <button
        className="inline-flex items-center gap-2 rounded bg-[#c2410c] px-5 py-3 text-sm font-medium text-white hover:bg-[#9a3412] disabled:opacity-50 transition-colors duration-200"
        onClick={onGenerate}
        disabled={disabled || brief.length < 4}
      >
        {disabled && <span className="spinner" aria-hidden />}
        {disabled ? "Working…" : "Generate"}
      </button>
    </div>
  );
}
