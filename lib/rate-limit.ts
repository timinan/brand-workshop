import { kv } from "@vercel/kv";

export interface RateLimitResult {
  allowed: boolean;
  remainingSession: number;
  remainingDay: number;
}

const SESSION_LIMIT = 3;
const DAY_LIMIT = 10;
const SESSION_WINDOW_SEC = 60 * 30; // 30 minutes
const DAY_WINDOW_SEC = 60 * 60 * 24;

function ipFromRequest(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

export async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  // KV disabled in local dev → allow everything.
  if (!process.env.KV_REST_API_URL) {
    return { allowed: true, remainingSession: SESSION_LIMIT, remainingDay: DAY_LIMIT };
  }
  const ip = ipFromRequest(req);
  const sessionKey = `rl:session:${ip}`;
  const dayKey = `rl:day:${ip}:${new Date().toISOString().slice(0, 10)}`;

  const [session, day] = await Promise.all([kv.incr(sessionKey), kv.incr(dayKey)]);
  if (session === 1) await kv.expire(sessionKey, SESSION_WINDOW_SEC);
  if (day === 1) await kv.expire(dayKey, DAY_WINDOW_SEC);

  return {
    allowed: session <= SESSION_LIMIT && day <= DAY_LIMIT,
    remainingSession: Math.max(0, SESSION_LIMIT - session),
    remainingDay: Math.max(0, DAY_LIMIT - day),
  };
}
