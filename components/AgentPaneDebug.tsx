"use client";
import { useState } from "react";
import type { AgentRuntimeEvent } from "./Workshop";

interface Props {
  events: AgentRuntimeEvent[];
  streamedText: string;
}

function fmtTs(ms: number): string {
  const d = new Date(ms);
  return (
    String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0") + ":" +
    String(d.getSeconds()).padStart(2, "0") + "." +
    String(d.getMilliseconds()).padStart(3, "0")
  );
}

function summary(ev: AgentRuntimeEvent): string {
  const p = ev.payload;
  switch (p.type) {
    case "agent_started":
    case "agent_completed":
      return "";
    case "agent_streaming":
      return `+${p.delta.length} chars`;
    case "agent_tool_use":
      return p.query.length > 60 ? p.query.slice(0, 60) + "…" : p.query;
    case "image_generated":
      return `image ${p.conceptIndex + 1}`;
    case "workshop_error":
      return p.error.length > 60 ? p.error.slice(0, 60) + "…" : p.error;
    default:
      return "";
  }
}

export default function AgentPaneDebug({ events, streamedText }: Props) {
  const [expanded, setExpanded] = useState(false);
  const last = events[events.length - 1];

  return (
    <div className="mt-4 pt-3 border-t border-stone-200">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[10px] uppercase tracking-[0.14em] text-stone-500 hover:text-stone-800 transition-colors duration-200"
      >
        {expanded ? "▾" : "▸"} Debug · {events.length} event{events.length === 1 ? "" : "s"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <section>
            <h4 className="text-[10px] uppercase tracking-[0.14em] text-stone-500 mb-1">Event log</h4>
            {events.length === 0 ? (
              <p className="text-xs italic text-stone-400">(no events yet)</p>
            ) : (
              <ul className="max-h-40 overflow-auto font-mono text-xs text-stone-700 space-y-0.5">
                {events.map((ev, i) => (
                  <li key={i}>
                    <span className="text-stone-400">{fmtTs(ev.ts)}</span>{" "}
                    <span className="text-stone-900">{ev.type}</span>
                    {summary(ev) && <span className="text-stone-600">  {summary(ev)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-stone-200 pt-3">
            <h4 className="text-[10px] uppercase tracking-[0.14em] text-stone-500 mb-1">Full stream</h4>
            {streamedText.length === 0 ? (
              <p className="text-xs italic text-stone-400">(no streamed output)</p>
            ) : (
              <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans italic text-sm text-stone-600 leading-relaxed">
                {streamedText}
              </p>
            )}
          </section>

          <section className="border-t border-stone-200 pt-3">
            <h4 className="text-[10px] uppercase tracking-[0.14em] text-stone-500 mb-1">Last event</h4>
            {last ? (
              <pre className="max-h-40 overflow-auto bg-stone-100 p-3 rounded font-mono text-[11px] text-stone-800 leading-snug">
                {JSON.stringify(last.payload, null, 2)}
              </pre>
            ) : (
              <p className="text-xs italic text-stone-400">(no events yet)</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
