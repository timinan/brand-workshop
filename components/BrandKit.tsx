"use client";
import { useRef } from "react";
import * as htmlToImage from "html-to-image";
import type { BrandKit as BrandKitData } from "@/lib/agents/types";

const VERDICT_CLASSES = {
  pass: "border border-stone-700 text-stone-700",
  warn: "border border-[#c2410c] text-[#c2410c]",
  fail: "border border-red-700 text-red-700",
} as const;
const VERDICT_LABEL = { pass: "Pass", warn: "Warn", fail: "Fail" } as const;

interface Props { kit: BrandKitData; onReset: () => void }

export default function BrandKit({ kit, onReset }: Props) {
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
    <section className="space-y-12 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm animate-slide-up" data-testid="brand-kit">
      <div ref={ref} className="space-y-12 bg-white p-2">
        <header className="animate-slide-up stagger-1">
          <h2 className="font-display text-5xl md:text-6xl tracking-[-0.02em] text-stone-950">{kit.name}</h2>
          {kit.autoSwapped && (
            <p className="mt-2 text-sm italic text-stone-500">
              Originally <em>{kit.autoSwapped.from}</em>, auto-swapped: {kit.autoSwapped.reason}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-up stagger-2">
          {kit.logos.map((logo, i) => (
            <figure key={i} className="space-y-2">
              <img src={logo.imageUrl} alt={logo.description} className="aspect-square w-full rounded border border-stone-200 bg-white object-contain" />
              <figcaption className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{logo.description}</figcaption>
            </figure>
          ))}
        </div>

        <div className="animate-slide-up stagger-3">
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">Taglines</h3>
          <ul className="space-y-3">
            {kit.taglines.map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-2xl text-stone-950">{t.tagline}</span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500">{t.angle}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-stone-700">Voice: {kit.voice}</p>
        </div>

        <blockquote className="animate-slide-up stagger-4 border-l-4 border-l-[#c2410c] pl-5 font-serif text-xl text-stone-900">
          {kit.positioning}
        </blockquote>

        <div className="animate-slide-up stagger-5">
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">Competitors (surfaced via web search)</h3>
          <ul className="space-y-1.5">
            {kit.competitors.map((c) => (
              <li key={c.url}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-900 hover:text-[#c2410c] hover:underline transition-colors duration-200"
                >
                  {c.name}
                </a>
                <span className="ml-2 text-stone-700">{c.differentiator}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-700"><strong className="text-stone-950">Differentiation:</strong> {kit.differentiation}</p>
          <p className="text-sm text-stone-700"><strong className="text-stone-950">Risk:</strong> {kit.risk}</p>
        </div>

        <div className="animate-slide-up stagger-6">
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">Brand Safety Signals</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(kit.scorecard) as [keyof typeof kit.scorecard, "pass" | "warn" | "fail"][]).map(([k, v]) => (
              <span key={k} className={`rounded-full bg-white px-3 py-1 text-xs ${VERDICT_CLASSES[v]}`}>
                {k}: {VERDICT_LABEL[v]}
              </span>
            ))}
          </div>
          {kit.findings.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-stone-700">
              {kit.findings.map((f, i) => <li key={i}>• <strong className="text-stone-950">{f.category}:</strong> {f.finding}</li>)}
            </ul>
          )}
        </div>

        <div className="animate-slide-up stagger-7">
          <h3 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-stone-500">Names considered</h3>
          <ul className="space-y-1 text-sm">
            {kit.namesConsidered.map((n) => (
              <li key={n.name} className={n.rejected ? "text-stone-500 line-through decoration-stone-400" : "text-stone-900"}>
                <strong>{n.name}</strong> — {n.reasoning}
                {n.rejected && n.reason && <span className="ml-1 italic">({n.reason})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={downloadPng} className="rounded bg-[#c2410c] px-4 py-2 text-sm font-medium text-white hover:bg-[#9a3412] transition-colors duration-200">
          Download PNG
        </button>
        <button onClick={copySummary} className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-stone-50 transition-colors duration-200">
          Copy summary
        </button>
        <button onClick={onReset} className="rounded border border-stone-300 px-4 py-2 text-sm text-stone-800 hover:bg-stone-50 transition-colors duration-200">
          Start over
        </button>
      </div>
    </section>
  );
}
