import { kv } from "@vercel/kv";

const PER_RUN_COST_USD = 0.08;

function todayKey(): string {
  return `cost:${new Date().toISOString().slice(0, 10)}`;
}

export async function isOverDailyCap(): Promise<boolean> {
  if (process.env.MODE !== "paid") return false;
  if (!process.env.KV_REST_API_URL) return false;
  const cap = Number(process.env.DAILY_COST_CAP_USD ?? "5");
  const spent = Number((await kv.get<string>(todayKey())) ?? 0);
  return spent >= cap;
}

export async function recordRunCost(): Promise<void> {
  if (process.env.MODE !== "paid") return;
  if (!process.env.KV_REST_API_URL) return;
  const key = todayKey();
  const next = await kv.incrbyfloat(key, PER_RUN_COST_USD);
  if (next === PER_RUN_COST_USD) await kv.expire(key, 60 * 60 * 36); // expire ~1.5 days
}
