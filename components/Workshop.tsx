"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { WorkshopEvent } from "@/lib/events/types";
import type {
  AgentName,
  BrandKit as BrandKitData,
  NamerOutput,
  BrandScoutOutput,
} from "@/lib/agents/types";
import BriefInput from "./BriefInput";
import PresetChips from "./PresetChips";
import AgentPane from "./AgentPane";
import NamePicker from "./NamePicker";
import ScoutConfirm from "./ScoutConfirm";
import BrandKit from "./BrandKit";

export type PaneState = "waiting" | "running" | "tool-use" | "done" | "error";
export type Phase = "idle" | "naming" | "picking" | "vetting" | "confirming" | "building" | "done";

export interface AgentRuntimeEvent {
  ts: number;
  type: WorkshopEvent["type"];
  payload: WorkshopEvent;
}

export interface AgentRuntimeState {
  state: PaneState;
  streamedText: string;
  toolQueries: string[];
  images: { index: number; url: string }[];
  error: string | null;
  events: AgentRuntimeEvent[];
}

const INITIAL_AGENT: AgentRuntimeState = {
  state: "waiting", streamedText: "", toolQueries: [], images: [], error: null, events: [],
};

const INITIAL_AGENTS: Record<AgentName, AgentRuntimeState> = {
  namer:        { ...INITIAL_AGENT },
  "brand-scout":{ ...INITIAL_AGENT },
  designer:     { ...INITIAL_AGENT },
  copywriter:   { ...INITIAL_AGENT },
  strategist:   { ...INITIAL_AGENT },
  director:     { ...INITIAL_AGENT },
};

function targetAgent(event: WorkshopEvent): AgentName | null {
  switch (event.type) {
    case "agent_started":
    case "agent_streaming":
    case "agent_tool_use":
    case "agent_completed":
      return event.agent;
    case "image_generated":
      return "designer";
    case "workshop_error":
      return event.agent ?? null;
    case "workshop_started":
    case "brand_kit_ready":
      return null;
    case "suggest_attempt_started":
    case "suggest_attempt_named":
    case "suggest_attempt_vetted":
    case "suggest_success":
    case "suggest_exhausted":
      return null;
  }
}

export default function Workshop() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [brief, setBrief] = useState("");
  const [agents, setAgents] = useState<Record<AgentName, AgentRuntimeState>>(INITIAL_AGENTS);
  const [candidates, setCandidates] = useState<NamerOutput | null>(null);
  const [chosenName, setChosenName] = useState<string | null>(null);
  const [brandScoutOutput, setBrandScoutOutput] = useState<BrandScoutOutput | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKitData | null>(null);
  const [workshopError, setWorkshopError] = useState<string | null>(null);
  const [avoidNames, setAvoidNames] = useState<string[]>([]);
  const debug = useSearchParams()?.get("debug") === "1";

  function reset() {
    setPhase("idle");
    setAgents({ ...INITIAL_AGENTS });
    setCandidates(null);
    setChosenName(null);
    setBrandScoutOutput(null);
    setBrandKit(null);
    setWorkshopError(null);
    setAvoidNames([]);
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
          if (event.agent) {
            next[event.agent] = { ...next[event.agent], state: "error", error: event.error };
          }
          break;
      }
      const target = targetAgent(event);
      if (target) {
        next[target] = {
          ...next[target],
          events: [...next[target].events, { ts: Date.now(), type: event.type, payload: event }],
        };
      }
      return next;
    });
    if (event.type === "brand_kit_ready") setBrandKit(event.brandKit);
    if (event.type === "workshop_error" && !event.agent) setWorkshopError(event.error);
  }

  async function streamPhase(url: string, body: unknown): Promise<{ events: WorkshopEvent[]; error: string | null }> {
    const events: WorkshopEvent[] = [];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = (await res.text()) || `Request failed (${res.status})`;
        setWorkshopError(msg);
        return { events, error: msg };
      }
      if (!res.body) {
        const msg = "No response from server.";
        setWorkshopError(msg);
        return { events, error: msg };
      }
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
          events.push(event);
          applyEvent(event);
        }
      }
      return { events, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setWorkshopError(msg);
      return { events, error: msg };
    }
  }

  async function runNaming() {
    const isRegenerate = phase === "picking";
    const avoidToSend = isRegenerate ? avoidNames.slice(-30) : [];
    if (!isRegenerate) {
      setAvoidNames([]);
    }
    setAgents({ ...INITIAL_AGENTS });
    setCandidates(null);
    setChosenName(null);
    setBrandScoutOutput(null);
    setBrandKit(null);
    setWorkshopError(null);
    setPhase("naming");
    const { events, error } = await streamPhase("/api/workshop/names", { brief, avoid: avoidToSend });
    if (error) {
      setPhase("idle");
      return;
    }
    const completed = events.find(
      (e): e is Extract<WorkshopEvent, { type: "agent_completed" }> =>
        e.type === "agent_completed" && e.agent === "namer",
    );
    if (completed) {
      const namerOutput = completed.output as NamerOutput;
      setCandidates(namerOutput);
      setAvoidNames((prev) => {
        const combined = [...prev, ...namerOutput.candidates.map((c) => c.name)];
        return combined.slice(-30);
      });
      setPhase("picking");
    } else {
      const errEvent = events.find((e) => e.type === "workshop_error");
      if (errEvent) setWorkshopError(errEvent.error);
      setPhase("idle");
    }
  }

  async function runVetting(name: string) {
    setWorkshopError(null);
    setChosenName(name);
    setPhase("vetting");
    setAgents((prev) => ({ ...prev, "brand-scout": { ...INITIAL_AGENT } }));
    const { events, error } = await streamPhase("/api/workshop/vet", { brief, chosenName: name });
    if (error) {
      setPhase("picking");
      return;
    }
    const completed = events.find(
      (e): e is Extract<WorkshopEvent, { type: "agent_completed" }> =>
        e.type === "agent_completed" && e.agent === "brand-scout",
    );
    if (completed) {
      setBrandScoutOutput(completed.output as BrandScoutOutput);
      setPhase("confirming");
    } else {
      const errEvent = events.find((e) => e.type === "workshop_error");
      if (errEvent) setWorkshopError(errEvent.error);
      setPhase("picking");
    }
  }

  async function runFinishing() {
    if (!candidates || !brandScoutOutput || !chosenName) return;
    setWorkshopError(null);
    setPhase("building");
    setAgents((prev) => ({
      ...prev,
      designer: { ...INITIAL_AGENT },
      copywriter: { ...INITIAL_AGENT },
      strategist: { ...INITIAL_AGENT },
    }));
    const { events, error } = await streamPhase("/api/workshop/finish", {
      brief,
      chosenName,
      namerOutput: candidates,
      brandScoutOutput,
    });
    if (error) {
      setPhase("confirming");
      return;
    }
    const ready = events.some((e) => e.type === "brand_kit_ready");
    if (ready) {
      setPhase("done");
    } else {
      const errEvent = events.find((e) => e.type === "workshop_error");
      setWorkshopError(errEvent?.error ?? "Workshop did not complete.");
      setPhase("confirming");
    }
  }

  function pickAgain() {
    setChosenName(null);
    setBrandScoutOutput(null);
    setAgents((prev) => ({ ...prev, "brand-scout": { ...INITIAL_AGENT } }));
    setPhase("picking");
  }

  const isBusy = phase === "naming" || phase === "vetting" || phase === "building";

  return (
    <div className="space-y-8">
      <BriefInput
        brief={brief}
        onChange={setBrief}
        onGenerate={runNaming}
        disabled={phase !== "idle"}
      />
      {workshopError && (
        <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {workshopError}
        </p>
      )}
      <PresetChips
        onPick={(_id, b, cached) => {
          setBrief(b);
          if (cached) {
            reset();
            setBrandKit(cached);
            setPhase("done");
          }
        }}
        disabled={phase !== "idle"}
      />

      {phase === "picking" && candidates && (
        <NamePicker
          candidates={candidates}
          onPick={(name) => runVetting(name)}
          onRegenerate={runNaming}
          onCustomName={(name) => runVetting(name)}
          disabled={isBusy}
        />
      )}

      {phase === "confirming" && brandScoutOutput && chosenName && (
        <ScoutConfirm
          chosenName={chosenName}
          brandScout={brandScoutOutput}
          onConfirm={runFinishing}
          onPickAgain={pickAgain}
          disabled={isBusy}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AgentPane agent="namer" runtime={agents.namer} debug={debug} />
          <AgentPane agent="brand-scout" runtime={agents["brand-scout"]} debug={debug} />
        </div>
        <div className="space-y-4">
          <AgentPane agent="designer" runtime={agents.designer} debug={debug} />
          <AgentPane agent="copywriter" runtime={agents.copywriter} debug={debug} />
          <AgentPane agent="strategist" runtime={agents.strategist} debug={debug} />
        </div>
      </div>

      {brandKit && <BrandKit kit={brandKit} onReset={reset} />}
    </div>
  );
}
