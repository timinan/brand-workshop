import type { LLMProvider, LLMStreamOptions, LLMChunk, ToolDefinition } from "../types";

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
}

interface ToolCallSlot {
  name?: string;
  argsBuf: string;
  emitted: boolean;
}

function toOpenAITools(tools?: ToolDefinition[]) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "search query" } },
        required: ["query"],
      },
    },
  }));
}

export class CloudflareLLMProvider implements LLMProvider {
  readonly name = "cloudflare" as const;
  constructor(private opts: { accountId: string; apiToken: string; model?: string }) {}

  async *stream(opts: LLMStreamOptions): AsyncIterable<LLMChunk> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.opts.accountId}/ai/v1/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.opts.model ?? DEFAULT_MODEL,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      stream: true,
    };
    const tools = toOpenAITools(opts.tools);
    if (tools) body.tools = tools;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.opts.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Cloudflare LLM failed: ${res.status} ${await res.text()}`);
    if (!res.body) throw new Error("Cloudflare LLM returned no body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let fullText = "";
    const toolCalls = new Map<number, ToolCallSlot>();

    const processLine = (line: string): LLMChunk[] => {
      const out: LLMChunk[] = [];
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return out;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return out;
      let chunk: OpenAIStreamChunk;
      try { chunk = JSON.parse(payload); } catch { return out; }
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) return out;
      if (delta.content) {
        fullText += delta.content;
        out.push({ type: "text_delta", text: delta.content });
      }
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const slot = toolCalls.get(tc.index) ?? { argsBuf: "", emitted: false };
          if (tc.function?.name) slot.name = tc.function.name;
          if (tc.function?.arguments) slot.argsBuf += tc.function.arguments;
          if (slot.name === "web_search" && !slot.emitted) {
            try {
              const args = JSON.parse(slot.argsBuf) as { query?: string };
              if (typeof args.query === "string") {
                slot.emitted = true;
                out.push({ type: "tool_use", tool: "web_search", query: args.query });
              }
            } catch { /* partial JSON — keep accumulating */ }
          }
          toolCalls.set(tc.index, slot);
        }
      }
      return out;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        for (const c of processLine(line)) yield c;
      }
    }
    if (buf.length > 0) {
      for (const c of processLine(buf)) yield c;
    }

    yield { type: "done", fullText };
  }
}
