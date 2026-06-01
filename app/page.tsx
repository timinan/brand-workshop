import Workshop from "@/components/Workshop";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24 space-y-24">
      <header className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Brand Workshop</p>
        <h1 className="font-display text-5xl md:text-6xl leading-[1.05] tracking-[-0.02em] text-stone-950">
          One sentence in, full brand kit <em className="font-display-italic text-[#c2410c]">out</em>.
        </h1>
      </header>
      <Workshop />
    </main>
  );
}
