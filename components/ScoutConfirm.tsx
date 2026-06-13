"use client";
import type { BrandScoutOutput } from "@/lib/agents/types";

interface Props {
  chosenName: string;
  brandScout: BrandScoutOutput;
  onConfirm: () => void;
  onPickAgain: () => void;
  onSuggestSimilar: () => void;
  disabled?: boolean;
  suggestInFlight?: boolean;
  suggestAttempt?: number;
  suggestExhausted?: boolean;
}

const VERDICT_CLASSES = {
  pass: "border border-stone-700 text-stone-700",
  warn: "border border-[#c2410c] text-[#c2410c]",
  fail: "border border-red-700 text-red-700",
} as const;
const VERDICT_LABEL = { pass: "Pass", warn: "Warn", fail: "Fail" } as const;
const MAX_ATTEMPTS = 3;

export default function ScoutConfirm({
  chosenName,
  brandScout,
  onConfirm,
  onPickAgain,
  onSuggestSimilar,
  disabled = false,
  suggestInFlight = false,
  suggestAttempt,
  suggestExhausted = false,
}: Props) {
  const hasFail = Object.values(brandScout.scorecard).includes("fail");
  const buttonsDisabled = disabled || suggestInFlight;

  return (
    <section
      data-testid="scout-confirm"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6 animate-slide-up"
    >
      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Brand safety check</h3>
        <h2 className="font-display text-4xl text-stone-950">{chosenName}</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(brandScout.scorecard) as [keyof typeof brandScout.scorecard, "pass" | "warn" | "fail"][]).map(([k, v]) => (
          <span key={k} className={`rounded-full bg-white px-3 py-1 text-xs ${VERDICT_CLASSES[v]}`}>
            {k}: {VERDICT_LABEL[v]}
          </span>
        ))}
      </div>

      {brandScout.findings.length > 0 && (
        <ul className="space-y-1 text-sm text-stone-700">
          {brandScout.findings.map((f, i) => (
            <li key={i}>• <strong className="text-stone-950">{f.category}:</strong> {f.finding}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={buttonsDisabled}
          className="rounded bg-[#c2410c] px-4 py-2 text-sm font-medium text-white hover:bg-[#9a3412] disabled:opacity-50 transition-colors duration-200"
          data-testid="confirm-name"
        >
          Use this name
        </button>
        {hasFail && (
          <button
            type="button"
            onClick={onSuggestSimilar}
            disabled={buttonsDisabled}
            className="rounded border border-[#c2410c] px-4 py-2 text-sm text-[#c2410c] hover:bg-[#fff7ed] disabled:opacity-50 transition-colors duration-200"
            data-testid="suggest-similar"
          >
            Suggest similar
          </button>
        )}
        <button
          type="button"
          onClick={onPickAgain}
          disabled={buttonsDisabled}
          className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-stone-50 disabled:opacity-50 transition-colors duration-200"
          data-testid="pick-again"
        >
          Pick a different name
        </button>
      </div>

      {suggestInFlight && (
        <p data-testid="suggest-progress" className="text-xs text-stone-700">
          Trying alternative... attempt {suggestAttempt ?? 1} of {MAX_ATTEMPTS}
        </p>
      )}

      {!suggestInFlight && suggestExhausted && (
        <p data-testid="suggest-exhausted" className="text-xs text-red-700 underline">
          No similar name passed in {MAX_ATTEMPTS} tries. Consider picking a different name.
        </p>
      )}

      {!suggestInFlight && !suggestExhausted && hasFail && (
        <p className="text-xs text-red-700 underline">
          This name has a serious issue — consider picking again.
        </p>
      )}
    </section>
  );
}
