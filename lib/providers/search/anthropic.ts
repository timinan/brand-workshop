import Anthropic from "@anthropic-ai/sdk";
import type { SearchProvider, SearchResult } from "../types";

export class AnthropicSearchProvider implements SearchProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? "claude-sonnet-4-6";
  }

  async search(query: string, opts?: { maxResults?: number }): Promise<SearchResult[]> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Search the web for: ${query}\nReturn the top ${opts?.maxResults ?? 5} results.`,
        },
      ],
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 1 } as unknown as Anthropic.Messages.Tool,
      ],
    });

    const block = res.content.find((b: any) => b.type === "web_search_tool_result") as any;
    if (!block?.content) return [];
    return block.content
      .filter((r: any) => r.type === "web_search_result")
      .slice(0, opts?.maxResults ?? 5)
      .map((r: any): SearchResult => ({
        title: String(r.title ?? ""),
        url: String(r.url ?? ""),
        snippet: String(r.snippet ?? r.encrypted_content ?? "").slice(0, 280),
      }));
  }
}
