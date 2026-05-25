import type { SearchProvider, SearchResult } from "../types";

interface BraveResponse {
  web?: { results?: Array<{ title: string; url: string; description?: string }> };
}

export class BraveSearchProvider implements SearchProvider {
  readonly name = "brave" as const;
  constructor(private opts: { apiKey: string }) {}

  async search(query: string, opts?: { maxResults?: number }): Promise<SearchResult[]> {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(opts?.maxResults ?? 5));

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": this.opts.apiKey,
      },
    });
    if (!res.ok) throw new Error(`Brave search failed: ${res.status} ${await res.text()}`);

    const data = (await res.json()) as BraveResponse;
    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description ?? "",
    }));
  }
}
