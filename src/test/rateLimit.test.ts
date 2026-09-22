import { afterEach, describe, expect, it } from 'vitest';
import { getRateLimit, recordRateLimit, resetRateLimit, subscribeRateLimit } from '../lib/rateLimit';

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

afterEach(() => resetRateLimit());

describe('recordRateLimit', () => {
  it('reads the quota off response headers', () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    recordRateLimit(headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '57',
      'x-ratelimit-reset': String(reset),
    }));

    const rate = getRateLimit();
    expect(rate?.limit).toBe(60);
    expect(rate?.remaining).toBe(57);
    expect(rate?.resetAt.getTime()).toBe(reset * 1000);
  });

  it('ignores a response with no quota headers', () => {
    recordRateLimit(headers({ 'content-type': 'application/json' }));
    expect(getRateLimit()).toBeNull();
  });

  it('ignores malformed values rather than storing NaN', () => {
    recordRateLimit(headers({
      'x-ratelimit-limit': 'lots',
      'x-ratelimit-remaining': '5',
      'x-ratelimit-reset': '123',
    }));
    expect(getRateLimit()).toBeNull();
  });

  it('does not let an out-of-order response walk the count back up', () => {
    const reset = Math.floor(Date.now() / 1000) + 600;
    const base = { 'x-ratelimit-limit': '60', 'x-ratelimit-reset': String(reset) };

    recordRateLimit(headers({ ...base, 'x-ratelimit-remaining': '50' }));
    // A slower response from earlier in the same window arrives late.
    recordRateLimit(headers({ ...base, 'x-ratelimit-remaining': '55' }));

    expect(getRateLimit()?.remaining).toBe(50);
  });

  it('accepts a higher count once the window has rolled over', () => {
    const now = Math.floor(Date.now() / 1000);
    recordRateLimit(headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '2',
      'x-ratelimit-reset': String(now + 60),
    }));
    recordRateLimit(headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '60',
      'x-ratelimit-reset': String(now + 3660),
    }));

    expect(getRateLimit()?.remaining).toBe(60);
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    let calls = 0;
    const unsubscribe = subscribeRateLimit(() => { calls += 1; });

    recordRateLimit(headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '59',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600),
    }));
    expect(calls).toBe(1);

    unsubscribe();
    recordRateLimit(headers({
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '58',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 600),
    }));
    expect(calls).toBe(1);
  });
});
