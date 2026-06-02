# Brand Workshop

Multiagent demo: one sentence → full brand kit. Five specialized agents (Namer,
Brand Scout, Designer, Copywriter, Strategist) coordinate via Server-Sent Events.

Every external dependency (LLM / image gen / search) is behind a swappable
adapter — switch providers with a single env var, no code changes.

## Local development

```bash
cp .env.example .env.local
# Fill in free-tier keys: BRAVE_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
# (Set GEMINI_API_KEY only if you want to fall back via LLM_PROVIDER=gemini.)
npm install
npm run dev
```

Visit http://localhost:3000.

## Provider modes

| Mode | LLM | Search | Image | Cost / run |
|---|---|---|---|---|
| **Free (default)** | Cloudflare Workers AI (Llama 3.3 70B) | Brave Search | Cloudflare Workers AI (FLUX) | $0 |
| **Paid** | Claude Sonnet 4.6 | Anthropic web_search | fal.ai (FLUX) | ~$0.05-0.10 |

Switch via env vars: `LLM_PROVIDER`, `SEARCH_PROVIDER`, `IMAGE_PROVIDER`, `MODE`.

## Tests

```bash
npm test               # unit + integration (Vitest)
npm run test:e2e       # Playwright (mocked SSE — no API keys needed)
npm run typecheck
npm run build
```

## Pre-deploy: bake the preset demos

The 3 preset chips on the landing page load instantly from cached `BrandKit`
JSON. Bake the cache before deploying:

```bash
npm run presets:generate
```

This calls the real workshop pipeline (uses real API keys) and writes the
results to `lib/presets/data.ts`. Commit the updated file.

## Deploy to Vercel

```bash
npx vercel link
# Add production env vars (one per command):
npx vercel env add BRAVE_API_KEY production
npx vercel env add CLOUDFLARE_ACCOUNT_ID production
npx vercel env add CLOUDFLARE_API_TOKEN production
npx vercel env add LLM_PROVIDER production           # value: cloudflare
npx vercel env add SEARCH_PROVIDER production        # value: brave
npx vercel env add IMAGE_PROVIDER production         # value: cloudflare
npx vercel env add MODE production                   # value: free
# Optional — override default model: CLOUDFLARE_LLM_MODEL
# Optional — legacy fallback: GEMINI_API_KEY (only if LLM_PROVIDER=gemini)
# Optional — paid mode + KV: connect Vercel KV via dashboard → Storage → KV.
# Optional — paid providers: ANTHROPIC_API_KEY, FAL_KEY, DAILY_COST_CAP_USD.

npx vercel --prod
```

Verify on the live URL:
- 3 preset chips load instantly (cached).
- Typing a brief and clicking Generate streams the workshop end-to-end in ~30-60s.
- Download PNG and Copy summary work on the brand kit.
- Lighthouse mobile score ≥ 90 (run via Chrome DevTools).

## Design rationale

See [`docs/superpowers/specs/2026-05-22-branding-workshop-design.md`](../PM-OS/docs/superpowers/specs/2026-05-22-branding-workshop-design.md) in the PM-OS repo for the full design spec, and [`docs/superpowers/plans/2026-05-25-branding-workshop-implementation.md`](../PM-OS/docs/superpowers/plans/2026-05-25-branding-workshop-implementation.md) for the implementation plan.

## Project structure

```
app/api/workshop/route.ts    SSE Edge endpoint
components/                  Workshop UI (Workshop, AgentPane, BrandKit, …)
lib/agents/                  Namer, Brand Scout, Designer, Copywriter, Strategist, Director
lib/providers/               LLM / image / search adapters + env-driven factory
lib/orchestrator/            workshop runner (sequential + parallel + auto-swap)
lib/events/                  SSE event types
lib/presets/                 Preset briefs + baked cached kits
scripts/generate-presets.ts  Builds preset cache against real APIs
tests/                       Vitest unit/integration + Playwright E2E
```
