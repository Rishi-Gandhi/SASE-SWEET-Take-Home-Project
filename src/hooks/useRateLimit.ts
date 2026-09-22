import { useSyncExternalStore } from 'react';
import { getRateLimit, subscribeRateLimit } from '../lib/rateLimit';
import type { RateLimit } from '../lib/rateLimit';

/**
 * The quota lives in a module-level store rather than React state because the
 * API client writes to it, and the client has no business importing a hook.
 * `useSyncExternalStore` is the supported way to read an outside store without
 * tearing during concurrent rendering.
 */
export function useRateLimit(): RateLimit | null {
  return useSyncExternalStore(subscribeRateLimit, getRateLimit, getRateLimit);
}
