import type { ImageProvider } from "@/lib/providers/types";
import { buildLogoImagePrompt, isNsfwImageError } from "@/lib/image-prompt";
import { DesignerOutputSchema, type DesignerOutput } from "./types";

const STYLES: { tag: string; modifier: string; description: (name: string) => string }[] = [
  {
    tag: "mark-and-wordmark",
    modifier: "a single geometric icon to the left of the wordmark, balanced composition",
    description: (n) => `Mark + wordmark lockup for "${n}".`,
  },
  {
    tag: "wordmark-only",
    modifier: "wordmark only, custom letterforms with subtle distinctive flourish, no separate icon",
    description: (n) => `Custom wordmark for "${n}".`,
  },
  {
    tag: "abstract-symbol",
    modifier: "abstract geometric symbol only, no text, suitable as a standalone app icon",
    description: (n) => `Abstract symbol concept for "${n}".`,
  },
];

export interface DesignerArgs {
  name: string;
  brief: string;
  image: ImageProvider;
  onImage: (conceptIndex: number, url: string) => void;
}

async function generateConceptImage(
  image: ImageProvider,
  name: string,
  style: (typeof STYLES)[number],
  index: number,
): Promise<string> {
  const attempts = [
    buildLogoImagePrompt(name, style.modifier, false),
    buildLogoImagePrompt(name, style.modifier, true),
  ];
  let lastErr: unknown;
  for (const prompt of attempts) {
    try {
      const { url } = await image.generate(prompt, { style: style.modifier, seed: index + 1 });
      return url;
    } catch (err) {
      lastErr = err;
      if (!isNsfwImageError(err)) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function runDesigner(args: DesignerArgs): Promise<DesignerOutput> {
  void args.brief; // brief informs upstream agents only — kept for API stability
  const concepts = await Promise.all(
    STYLES.map(async (s, i) => {
      const imageUrl = await generateConceptImage(args.image, args.name, s, i);
      args.onImage(i, imageUrl);
      return { imageUrl, description: s.description(args.name), styleTags: [s.tag] };
    }),
  );
  return DesignerOutputSchema.parse({ concepts });
}
