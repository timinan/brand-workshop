import { describe, it, expect, vi, beforeEach } from "vitest";
import { CloudflareLLMProvider } from "@/lib/providers/llm/cloudflare";
import type { LLMChunk } from "@/lib/providers/types";

const fetchMock = vi.fn();

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i++]));
      } else {
        controller.close();
      }
    },
  });
}

describe("CloudflareLLMProvider", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("yields text_delta chunks and a final done chunk", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: sseBody([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Hel" } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n\n`,
        `data: [DONE]\n\n`,
      ]),
    });

    const provider = new CloudflareLLMProvider({ accountId: "acc", apiToken: "tok" });
    const chunks: LLMChunk[] = [];
    for await (const c of provider.stream({ systemPrompt: "s", userPrompt: "u" })) chunks.push(c);

    expect(chunks).toEqual([
      { type: "text_delta", text: "Hel" },
      { type: "text_delta", text: "lo" },
      { type: "done", fullText: "Hello" },
    ]);
  });

  it("requests json_object format when responseSchema is set", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: sseBody([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "{}" } }] })}\n\n`,
        `data: [DONE]\n\n`,
      ]),
    });

    const provider = new CloudflareLLMProvider({ accountId: "acc", apiToken: "tok" });
    for await (const _ of provider.stream({
      systemPrompt: "s",
      userPrompt: "u",
      responseSchema: { type: "object" },
    })) { /* drain */ }

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("emits a single tool_use when a web_search call streams across chunks", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: sseBody([
        `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: "web_search" } }] } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "{\"query\":\"pebble trademark\"}" } }] } }] })}\n\n`,
        `data: [DONE]\n\n`,
      ]),
    });

    const provider = new CloudflareLLMProvider({ accountId: "acc", apiToken: "tok" });
    const chunks: LLMChunk[] = [];
    for await (const c of provider.stream({
      systemPrompt: "s", userPrompt: "u",
      tools: [{ name: "web_search", description: "search the web" }],
    })) chunks.push(c);

    const toolUses = chunks.filter((c) => c.type === "tool_use");
    expect(toolUses).toEqual([
      { type: "tool_use", tool: "web_search", query: "pebble trademark" },
    ]);
  });
});
