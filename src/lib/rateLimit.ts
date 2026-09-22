/**
 * GitHub reports the caller's remaining quota on the headers of every
 * response, including failures. Rather than throw that away and only surface
 * it once the app is already broken, we record it on each call and show a live
 * meter — the budget is the single biggest constraint on this app, so it
 * belongs on screen.
 */
export interface RateLimit {
  limit: number;
  remaining: number;
  resetAt: Date;
  observedAt: Date;
}

let current: RateLimit | null = null;
const listeners = new Set<() => void>();

/**
 * Reads the quota headers off a response. Returns silently when they are
 * absent — a CORS preflight or a stubbed response in tests has no headers to
 * read, and that is not an error worth surfacing.
 */
export function recordRateLimit(headers: Headers): void {
  const limit = Number(headers.get('x-ratelimit-limit'));
  const remaining = Number(headers.get('x-ratelimit-remaining'));
  const reset = Number(headers.get('x-ratelimit-reset'));

  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || !Number.isFinite(reset)) return;
  if (limit <= 0) return;

  // A response can arrive out of order behind a newer one; keep the lower
  // remaining count for the same window so the meter never ticks backwards.
  const next: RateLimit = {
    limit,
    remaining,
    resetAt: new Date(reset * 1000),
    observedAt: new Date(),
  };

  if (
    current &&
    current.resetAt.getTime() === next.resetAt.getTime() &&
    current.remaining < next.remaining
  ) {
    return;
  }

  current = next;
  for (const listener of listeners) listener();
}

/** Subscribe/getSnapshot pair for `useSyncExternalStore`. */
export function subscribeRateLimit(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRateLimit(): RateLimit | null {
  return current;
}

/** Tests only: the store is module-level and would otherwise leak between them. */
export function resetRateLimit(): void {
  current = null;
  for (const listener of listeners) listener();
}
