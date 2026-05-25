import * as falModule from "@fal-ai/serverless-client";
import type { ImageProvider } from "../types";

const { fal } = falModule as unknown as {
  fal: {
    config: (opts: { credentials: string }) => void;
    subscribe: <T>(endpoint: string, opts: unknown) => Promise<T>;
  };
};

export class FalImageProvider implements ImageProvider {
  readonly name = "fal" as const;

  constructor(opts: { apiKey: string }) {
    fal.config({ credentials: opts.apiKey });
  }

  async generate(prompt: string, opts?: { style?: string; seed?: number }): Promise<{ url: string }> {
    const fullPrompt = opts?.style ? `${opts.style}. ${prompt}` : prompt;
    const result = await fal.subscribe<{ images: { url: string }[] }>("fal-ai/flux/schnell", {
      input: { prompt: fullPrompt, image_size: "square_hd", num_images: 1, seed: opts?.seed },
      logs: false,
    });
    const img = result.images?.[0];
    if (!img?.url) throw new Error("fal.ai returned no image");
    return { url: img.url };
  }
}
