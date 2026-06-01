interface Props { from: string; to: string; reason: string }

export default function AutoSwapBanner({ from, to, reason }: Props) {
  return (
    <div
      role="status"
      className="rounded-r-md border-l-4 border-l-[#c2410c] bg-stone-100 px-4 py-3 text-sm text-stone-800 animate-slide-in"
      data-testid="auto-swap-banner"
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#c2410c] mb-1">Auto-swap</p>
      <code className="rounded bg-white border border-stone-300 px-1.5 py-0.5 font-mono text-xs text-stone-900">{from}</code>
      <span className="mx-2 text-stone-500">→</span>
      <code className="rounded bg-white border border-stone-300 px-1.5 py-0.5 font-mono text-xs text-stone-900">{to}</code>
      <span className="ml-2 text-stone-700">— {reason}</span>
    </div>
  );
}
