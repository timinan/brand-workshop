interface Props { query: string }

export default function ToolUseChip({ query }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 ring-1 ring-blue-200">
      <span aria-hidden>🔍</span>
      <span className="truncate max-w-[200px]" title={query}>{query}</span>
    </span>
  );
}
