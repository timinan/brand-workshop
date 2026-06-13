import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/providers/factory", () => ({
  getLLMProvider: () => ({ name: "gemini", async *stream() {} }),
  getSearchProvider: () => ({ name: "brave", search: async () => [] }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
}));

vi.mock("@/lib/cost-cap", () => ({
  isOverDailyCap: async () => false,
  recordRunCost: async () => {},
}));

const { POST } = await import("@/app/api/workshop/suggest-similar/route");

function makeReq(body: unknown) {
  return new Request("http://x/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

const validScorecard = { existingCompany: "pass", domain: "fail", trademark: "pass", connotations: "pass" };

describe("POST /api/workshop/suggest-similar", () => {
  it("rejects missing brief", async () => {
    const res = await POST(makeReq({ rejectedName: "Pebble", scorecard: validScorecard }));
    expect(res.status).toBe(400);
  });

  it("rejects too-long rejectedName", async () => {
    const res = await POST(makeReq({ brief: "valid brief here", rejectedName: "x".repeat(61), scorecard: validScorecard }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid scorecard", async () => {
    const res = await POST(makeReq({ brief: "valid brief here", rejectedName: "Pebble", scorecard: { foo: "bar" } }));
    expect(res.status).toBe(400);
  });

  it("rejects bad avoid type", async () => {
    const res = await POST(makeReq({ brief: "valid brief here", rejectedName: "Pebble", scorecard: validScorecard, avoid: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid body and returns an SSE response", async () => {
    const res = await POST(makeReq({ brief: "valid brief here", rejectedName: "Pebble", scorecard: validScorecard, findings: [], avoid: [] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });
});

describe("POST /api/workshop/suggest-similar — rate limit and cap", () => {
  beforeEach(() => vi.resetModules());

  it("returns 429 when rate-limited", async () => {
    vi.doMock("@/lib/rate-limit", () => ({
      checkRateLimit: async () => ({ allowed: false }),
    }));
    vi.doMock("@/lib/providers/factory", () => ({
      getLLMProvider: () => ({ name: "gemini", async *stream() {} }),
      getSearchProvider: () => ({ name: "brave", search: async () => [] }),
    }));
    vi.doMock("@/lib/cost-cap", () => ({ isOverDailyCap: async () => false, recordRunCost: async () => {} }));
    const mod = await import("@/app/api/workshop/suggest-similar/route");
    const res = await mod.POST(makeReq({ brief: "valid brief here", rejectedName: "Pebble", scorecard: validScorecard }));
    expect(res.status).toBe(429);
  });

  it("returns 429 when over daily cap", async () => {
    vi.doMock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }) }));
    vi.doMock("@/lib/providers/factory", () => ({
      getLLMProvider: () => ({ name: "gemini", async *stream() {} }),
      getSearchProvider: () => ({ name: "brave", search: async () => [] }),
    }));
    vi.doMock("@/lib/cost-cap", () => ({ isOverDailyCap: async () => true, recordRunCost: async () => {} }));
    const mod = await import("@/app/api/workshop/suggest-similar/route");
    const res = await mod.POST(makeReq({ brief: "valid brief here", rejectedName: "Pebble", scorecard: validScorecard }));
    expect(res.status).toBe(429);
  });
});
