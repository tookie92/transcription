/**
 * Light in-process guard for Groq routes.
 * Not a distributed rate limiter — enough to soften bursts before launch.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 24;
const hitsByKey = new Map<string, number[]>();

export type GroqLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkGroqRateLimit(key: string): GroqLimitResult {
  const now = Date.now();
  const recent = (hitsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));
    hitsByKey.set(key, recent);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  hitsByKey.set(key, recent);
  return { ok: true };
}

export function groqClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return `ip:${realIp}`;
  return "ip:anon";
}

export function isGroqRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { status?: number; code?: string; error?: { code?: string } };
  if (record.status === 429) return true;
  const code = record.code ?? record.error?.code;
  return code === "rate_limit_exceeded" || code === "insufficient_quota";
}

export function groqFailureMessage(error: unknown): string {
  if (isGroqRateLimitError(error)) {
    return "AI is busy — try again in a minute";
  }
  if (!process.env.GROQ_API_KEY) {
    return "AI not configured — using local fallback";
  }
  return "AI unavailable — using local fallback";
}
