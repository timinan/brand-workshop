import Workshop from "@/components/Workshop";

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-4xl">Brand Workshop</h1>
        <p className="mt-2 text-neutral-600">One sentence in, full brand kit out. A multiagent live demo.</p>
      </header>
      <Workshop />
    </main>
  );
}
