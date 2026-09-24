import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// matchMedia is universal in browsers but absent from jsdom (and was missing
// from old Safari's change-listener API), so both are treated as optional.
function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener?.('change', onChange);
  return () => media.removeEventListener?.('change', onChange);
}

function getSnapshot(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

/**
 * The viewer's motion preference, live. The CSS already zeroes durations
 * under reduced motion; this is for the motion JavaScript drives — the hero
 * loop, carousel auto-advance, pointer tilt, and smooth scrolling.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
