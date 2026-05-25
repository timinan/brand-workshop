import type { ImageProvider } from "../types";

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export class CloudflareImageProvider implements ImageProvider {
  readonly name = "cloudflare" as const;
  constructor(private opts: { accountId: string; apiToken: string }) {}

  async generate(prompt: string, opts?: { style?: string; seed?: number }): Promise<{ url: string }> {
    const fullPrompt = opts?.style ? `${opts.style}. ${prompt}` : prompt;
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.opts.accountId}/ai/run/${MODEL}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: fullPrompt, num_steps: 4, seed: opts?.seed }),
    });

    if (!res.ok) throw new Error(`Cloudflare image gen failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as { result?: { image?: string } };
    const b64 = data.result?.image;
    if (!b64) throw new Error("Cloudflare image gen returned no image");
    return { url: `data:image/png;base64,${b64}` };
  }
}
