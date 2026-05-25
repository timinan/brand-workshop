import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FunctionDeclarationsTool } from "@google/generative-ai";
import type { LLMProvider, LLMStreamOptions, LLMChunk, ToolDefinition } from "../types";

// Use string literals matching SchemaType enum values so the mock doesn't
// need to export SchemaType. The Gemini SDK accepts both.
function toGeminiTools(tools?: ToolDefinition[]): FunctionDeclarationsTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: "object" as const,
          properties: { query: { type: "string" as const, description: "search query" } },
          required: ["query"],
        },
      })),
    },
  ];
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new GoogleGenerativeAI(opts.apiKey);
    this.model = opts.model ?? "gemini-2.0-flash";
  }

  async *stream(opts: LLMStreamOptions): AsyncIterable<LLMChunk> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: opts.systemPrompt,
      tools: toGeminiTools(opts.tools),
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        temperature: opts.temperature ?? 0.7,
      },
    });

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    });

    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text?.() ?? "";
      if (text) {
        fullText += text;
        yield { type: "text_delta", text };
      }
      const calls = chunk.functionCalls?.() ?? [];
      for (const call of calls) {
        if (call.name === "web_search") {
          const query = String((call.args as { query?: string })?.query ?? "");
          yield { type: "tool_use", tool: "web_search", query };
        }
      }
    }

    yield { type: "done", fullText };
  }
}
