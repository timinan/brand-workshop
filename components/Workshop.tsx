"use client";
import { useState } from "react";
import type { WorkshopEvent } from "@/lib/events/types";
import type { AgentName, BrandKit as BrandKitData } from "@/lib/agents/types";
import BriefInput from "./BriefInput";
import PresetChips from "./PresetChips";
import AgentPane from "./AgentPane";
import AutoSwapBanner from "./AutoSwapBanner";
import BrandKit from "./BrandKit";

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
  const [brandKit, setBrandKit] = useState<BrandKitData | null>(null);
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
      <PresetChips
          onPick={(_id, b, cached) => {
            setBrief(b);
            if (cached) {
              reset();
              setBrandKit(cached);
              if (cached.autoSwapped) setAutoSwap(cached.autoSwapped);
            }
          }}
          disabled={running}
        />

      {autoSwap && <AutoSwapBanner from={autoSwap.from} to={autoSwap.to} reason={autoSwap.reason} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AgentPane agent="namer" runtime={agents.namer} />
          <AgentPane agent="brand-scout" runtime={agents["brand-scout"]} />
        </div>
        <div className="space-y-4">
          <AgentPane agent="designer" runtime={agents.designer} />
          <AgentPane agent="copywriter" runtime={agents.copywriter} />
          <AgentPane agent="strategist" runtime={agents.strategist} />
        </div>
      </div>

      {brandKit && <BrandKit kit={brandKit} />}
    </div>
  );
}
