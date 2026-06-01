interface Props { query: string }

export default function ToolUseChip({ query }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700">
      <span aria-hidden className="font-serif text-stone-500">→</span>
      <span className="truncate max-w-[200px]" title={query}>{query}</span>
    </span>
  );
}
