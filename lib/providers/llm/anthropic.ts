import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMStreamOptions, LLMChunk, ToolDefinition } from "../types";

function toAnthropicTools(tools?: ToolDefinition[]) {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" as const, description: "search query" } },
      required: ["query"],
    },
  }));
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? "claude-sonnet-4-6";
  }

  async *stream(opts: LLMStreamOptions): AsyncIterable<LLMChunk> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userPrompt }],
      tools: toAnthropicTools(opts.tools),
    });

    let fullText = "";
    let currentTool: { name: string; jsonBuffer: string } | null = null;

    for await (const event of stream as unknown as AsyncIterable<any>) {
      if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
        currentTool = { name: event.content_block.name, jsonBuffer: "" };
      } else if (event.type === "content_block_delta") {
        const d = event.delta;
        if (d?.type === "text_delta" && typeof d.text === "string") {
          fullText += d.text;
          yield { type: "text_delta", text: d.text };
        } else if (d?.type === "input_json_delta" && currentTool) {
          currentTool.jsonBuffer += d.partial_json ?? "";
        }
      } else if (event.type === "content_block_stop" && currentTool) {
        try {
          const parsed = JSON.parse(currentTool.jsonBuffer) as { query?: string };
          if (currentTool.name === "web_search") {
            yield { type: "tool_use", tool: "web_search", query: String(parsed.query ?? "") };
          }
        } catch {
          // Drop malformed tool input — next stream chunk continues.
        }
        currentTool = null;
      }
    }

    yield { type: "done", fullText };
  }
}
