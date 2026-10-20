import { NextRequest } from 'next/server';

/**
 * Best-effort in-memory limiter for login endpoints.
 * State lives per serverless instance, so it slows brute force but is not a global guarantee.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || 'unknown').trim();
}

export function isRateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
