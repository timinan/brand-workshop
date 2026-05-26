"use client";
import { useState } from "react";
import type { WorkshopEvent } from "@/lib/events/types";
import type { AgentName, BrandKit } from "@/lib/agents/types";
import BriefInput from "./BriefInput";
import PresetChips from "./PresetChips";

export type PaneState = "waiting" | "running" | "tool-use" | "done" | "error";

export interface AgentRuntimeState {
  state: PaneState;
  streamedText: string;
  toolQueries: string[];
  images: { index: number; url: string }[];
  error: string | null;
}

const INITIAL: Record<AgentName, AgentRuntimeState> = {
  namer:        { state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
  "brand-scout":{ state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
  designer:     { state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
  copywriter:   { state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
  strategist:   { state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
  director:     { state: "waiting", streamedText: "", toolQueries: [], images: [], error: null },
};

export default function Workshop() {
  const [brief, setBrief] = useState("");
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState<Record<AgentName, AgentRuntimeState>>(INITIAL);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [autoSwap, setAutoSwap] = useState<{ from: string; to: string; reason: string } | null>(null);

  function reset() {
    setAgents(INITIAL);
    setBrandKit(null);
    setAutoSwap(null);
  }

  async function start() {
    reset();
    setRunning(true);
    const res = await fetch("/api/workshop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
    });
    if (!res.body) { setRunning(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        const event = JSON.parse(dataLine.slice(6)) as WorkshopEvent;
        applyEvent(event);
      }
    }
    setRunning(false);
  }

  function applyEvent(event: WorkshopEvent) {
    setAgents((prev) => {
      const next = { ...prev };
      switch (event.type) {
        case "agent_started":
          next[event.agent] = { ...next[event.agent], state: "running", error: null };
          break;
        case "agent_streaming":
          next[event.agent] = { ...next[event.agent], streamedText: next[event.agent].streamedText + event.delta };
          break;
        case "agent_tool_use":
          next[event.agent] = { ...next[event.agent], state: "tool-use", toolQueries: [...next[event.agent].toolQueries, event.query] };
          break;
        case "agent_completed":
          next[event.agent] = { ...next[event.agent], state: "done" };
          break;
        case "image_generated":
          next.designer = { ...next.designer, images: [...next.designer.images, { index: event.conceptIndex, url: event.url }] };
          break;
        case "workshop_error":
          if (event.agent) next[event.agent] = { ...next[event.agent], state: "error", error: event.error };
          break;
      }
      return next;
    });
    if (event.type === "auto_swap") setAutoSwap({ from: event.from, to: event.to, reason: event.reason });
    if (event.type === "brand_kit_ready") setBrandKit(event.brandKit);
  }

  return (
    <div className="space-y-8">
      <BriefInput brief={brief} onChange={setBrief} onGenerate={start} disabled={running} />
      <PresetChips onPick={(_id, b) => { setBrief(b); }} disabled={running} />

      {autoSwap && (
        <div className="rounded border border-amber-400 bg-amber-50 p-3 text-sm">
          Swapped <strong>{autoSwap.from}</strong> → <strong>{autoSwap.to}</strong> — {autoSwap.reason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <pre data-testid="namer-pane" className="rounded border p-3">{`Namer · ${agents.namer.state}`}</pre>
          <pre data-testid="brand-scout-pane" className="rounded border p-3">{`Brand Scout · ${agents["brand-scout"].state}`}</pre>
        </div>
        <div className="space-y-4">
          <pre data-testid="designer-pane" className="rounded border p-3">{`Designer · ${agents.designer.state}`}</pre>
          <pre data-testid="copywriter-pane" className="rounded border p-3">{`Copywriter · ${agents.copywriter.state}`}</pre>
          <pre data-testid="strategist-pane" className="rounded border p-3">{`Strategist · ${agents.strategist.state}`}</pre>
        </div>
      </div>

      {brandKit && (
        <pre data-testid="brand-kit" className="rounded border p-4 text-xs">{JSON.stringify(brandKit, null, 2)}</pre>
      )}
    </div>
  );
}
