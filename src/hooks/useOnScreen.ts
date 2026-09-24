import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Whether an element is on screen, with a little hysteresis: it counts as
 * arrived once `enterRatio` of it is visible, and as gone only once none of
 * it is. That keeps a loop from stuttering on and off at the edge.
 *
 * It reads the ratio because an IntersectionObserver's `isIntersecting` is
 * true for any sliver at all, whatever threshold was asked for. Without an
 * observer (jsdom) nothing is ever on screen, so nothing animates in tests.
 */
export function useOnScreen(ref: RefObject<Element | null>, enterRatio: number): boolean {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver !== 'function') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= enterRatio) setOnScreen(true);
        else if (!entry.isIntersecting) setOnScreen(false);
      },
      { threshold: [0, enterRatio] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, enterRatio]);

  return onScreen;
}
