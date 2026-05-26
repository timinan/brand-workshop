interface Props { from: string; to: string; reason: string }

export default function AutoSwapBanner({ from, to, reason }: Props) {
  return (
    <div
      role="status"
      className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm shadow-sm transition-all animate-slide-in"
      data-testid="auto-swap-banner"
    >
      <strong className="font-medium">Auto-swapped:</strong>{" "}
      <code className="rounded bg-amber-100 px-1">{from}</code> →{" "}
      <code className="rounded bg-amber-100 px-1">{to}</code> — {reason}
    </div>
  );
}
