import type { Context } from "hono";
import { getConnInfo } from "hono/bun";
import { createMiddleware } from "hono/factory";
import { env } from "./env.js";

/**
 * In-process fixed-window rate limiting.
 *
 * Sized for the current single-container deployment: counters live in memory,
 * so they reset on restart and do not coordinate across replicas. Move them to
 * a shared store before running more than one API instance.
 */
type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Sweep expired windows once the map grows past this, so it cannot leak. */
const SWEEP_THRESHOLD = 10_000;

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function consume(
  key: string,
  limit: number,
  windowSeconds: number,
  now: number = Date.now(),
): RateLimitDecision {
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= SWEEP_THRESHOLD) {
      for (const [candidate, window] of windows) {
        if (window.resetAt <= now) {
          windows.delete(candidate);
        }
      }
    }

    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test seam. Production code never clears counters. */
export function resetRateLimits(): void {
  windows.clear();
}

/**
 * Best-effort client address.
 *
 * `X-Forwarded-For` is only consulted when TRUST_PROXY is set, because any
 * client that can reach the API directly can otherwise forge it and sidestep
 * every limit below.
 */
export function clientAddress(c: Context): string {
  if (env.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) {
      return forwarded;
    }
  }

  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    // No connection info outside a real server (unit tests, for example).
    return "unknown";
  }
}

export type RateLimitOptions = {
  /** Namespace so separate routes do not share a counter. */
  scope: string;
  limit: number;
  windowSeconds: number;
};

function tooManyRequests(c: Context, retryAfterSeconds: number) {
  return c.json({ error: "Too many requests" }, 429, {
    "Retry-After": String(retryAfterSeconds),
  });
}

/** Limits a route by client address. */
export function rateLimitByAddress(options: RateLimitOptions) {
  return createMiddleware(async (c, next) => {
    const decision = consume(
      `${options.scope}:addr:${clientAddress(c)}`,
      options.limit,
      options.windowSeconds,
    );

    if (!decision.allowed) {
      return tooManyRequests(c, decision.retryAfterSeconds);
    }

    await next();
  });
}

/**
 * Limits repeated attempts against one identifier, such as an email address.
 *
 * Returns the same response shape as the address limiter so a throttled
 * request never reveals whether the identifier belongs to an existing account.
 */
export function checkIdentifierLimit(
  c: Context,
  options: RateLimitOptions,
  identifier: string,
): Response | null {
  const decision = consume(
    `${options.scope}:id:${identifier.trim().toLowerCase()}`,
    options.limit,
    options.windowSeconds,
  );

  return decision.allowed
    ? null
    : tooManyRequests(c, decision.retryAfterSeconds);
}
