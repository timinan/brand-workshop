export type ToolName = "web_search";

export interface ToolDefinition {
  name: ToolName;
  description: string;
}

export interface ToolUse {
  type: "tool_use";
  tool: ToolName;
  query: string;
}

export type LLMChunk =
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; tool: ToolName; query: string }
  | { type: "tool_result"; tool: ToolName; result: SearchResult[] }
  | { type: "done"; fullText: string };

export interface LLMStreamOptions {
  systemPrompt: string;
  userPrompt: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  readonly name: "anthropic" | "gemini";
  stream(opts: LLMStreamOptions): AsyncIterable<LLMChunk>;
}

export interface ImageProvider {
  readonly name: "fal" | "cloudflare";
  generate(prompt: string, opts?: { style?: string; seed?: number }): Promise<{ url: string }>;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  readonly name: "brave" | "anthropic";
  search(query: string, opts?: { maxResults?: number }): Promise<SearchResult[]>;
}
