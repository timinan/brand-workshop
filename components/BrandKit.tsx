"use client";
import { useRef } from "react";
import * as htmlToImage from "html-to-image";
import type { BrandKit as BrandKitData } from "@/lib/agents/types";

const VERDICT_COLOR = { pass: "bg-emerald-100 text-emerald-800", warn: "bg-amber-100 text-amber-800", fail: "bg-red-100 text-red-800" } as const;
const VERDICT_LABEL = { pass: "Pass", warn: "Warn", fail: "Fail" } as const;

interface Props { kit: BrandKitData }

export default function BrandKit({ kit }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  async function downloadPng() {
    if (!ref.current) return;
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${kit.name.toLowerCase()}-brand-kit.png`;
    a.click();
  }

  async function copySummary() {
    const text = [
      `Brand: ${kit.name}`,
      `Positioning: ${kit.positioning}`,
      ``,
      `Taglines:`,
      ...kit.taglines.map((t) => `  - (${t.angle}) ${t.tagline}`),
      ``,
      `Competitors:`,
      ...kit.competitors.map((c) => `  - ${c.name} (${c.url}) — ${c.differentiator}`),
      ``,
      `Differentiation: ${kit.differentiation}`,
      `Risk: ${kit.risk}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm animate-slide-up" data-testid="brand-kit">
      <div ref={ref} className="space-y-8 bg-white p-2">
        <header>
          <h2 className="font-serif text-5xl">{kit.name}</h2>
          {kit.autoSwapped && (
            <p className="mt-1 text-sm text-neutral-500">
              Originally <em>{kit.autoSwapped.from}</em>, auto-swapped: {kit.autoSwapped.reason}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kit.logos.map((logo, i) => (
            <figure key={i} className="space-y-2">
              <img src={logo.imageUrl} alt={logo.description} className="aspect-square w-full rounded border bg-white object-contain" />
              <figcaption className="text-xs text-neutral-500">{logo.description}</figcaption>
            </figure>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Taglines</h3>
          <ul className="space-y-2">
            {kit.taglines.map((t, i) => (
              <li key={i}>
                <span className="font-serif text-2xl">&quot;{t.tagline}&quot;</span>
                <span className="ml-2 text-xs uppercase tracking-wide text-neutral-500">{t.angle}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-neutral-500">Voice: {kit.voice}</p>
        </div>

        <blockquote className="border-l-4 border-neutral-900 pl-4 font-serif text-xl italic">{kit.positioning}</blockquote>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Competitors (surfaced via web search)</h3>
          <ul className="space-y-1">
            {kit.competitors.map((c) => (
              <li key={c.url}>
                <a href={c.url} target="_blank" rel="noreferrer" className="font-medium underline">{c.name}</a>
                <span className="ml-2 text-neutral-700">{c.differentiator}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm"><strong>Differentiation:</strong> {kit.differentiation}</p>
          <p className="text-sm"><strong>Risk:</strong> {kit.risk}</p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Brand Safety Signals</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(kit.scorecard) as [keyof typeof kit.scorecard, "pass" | "warn" | "fail"][]).map(([k, v]) => (
              <span key={k} className={`rounded-full px-3 py-1 text-xs ${VERDICT_COLOR[v]}`}>
                {k}: {VERDICT_LABEL[v]}
              </span>
            ))}
          </div>
          {kit.findings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {kit.findings.map((f, i) => <li key={i}>• <strong>{f.category}:</strong> {f.finding}</li>)}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Names considered</h3>
          <ul className="space-y-1 text-sm">
            {kit.namesConsidered.map((n) => (
              <li key={n.name} className={n.rejected ? "text-neutral-500" : ""}>
                <strong>{n.name}</strong> — {n.reasoning}
                {n.rejected && n.reason && <span className="ml-1 italic">({n.reason})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={downloadPng} className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">Download PNG</button>
        <button onClick={copySummary} className="rounded border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100">Copy summary</button>
      </div>
    </section>
  );
}
