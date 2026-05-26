import type { ImageProvider } from "@/lib/providers/types";
import { DesignerOutputSchema, type DesignerOutput } from "./types";

const STYLE_BASE =
  "minimalist logo, monochrome, flat vector, geometric, generous negative space, no gradient, no photorealism, white background, centered";

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

export async function runDesigner(args: DesignerArgs): Promise<DesignerOutput> {
  const concepts = await Promise.all(
    STYLES.map(async (s, i) => {
      const prompt = `${STYLE_BASE}, ${s.modifier}, brand name "${args.name}", inspired by: ${args.brief}`;
      const { url } = await args.image.generate(prompt, { style: s.modifier, seed: i + 1 });
      args.onImage(i, url);
      return { imageUrl: url, description: s.description(args.name), styleTags: [s.tag] };
    }),
  );
  return DesignerOutputSchema.parse({ concepts });
}
