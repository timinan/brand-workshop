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
        className="flex-1 rounded border border-neutral-300 px-3 py-2 text-base"
        placeholder="One sentence: an AI tool for product managers"
        value={brief}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled && brief.length >= 4) onGenerate();
        }}
        disabled={disabled}
      />
      <button
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        onClick={onGenerate}
        disabled={disabled || brief.length < 4}
      >
        {disabled ? "Working..." : "Generate"}
      </button>
    </div>
  );
}
