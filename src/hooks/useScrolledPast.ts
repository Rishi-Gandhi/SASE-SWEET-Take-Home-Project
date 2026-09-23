import { useEffect, useState } from 'react';

/**
 * True once the observed element has scrolled up out of view.
 *
 * Takes the element itself rather than a ref: the node it watches only mounts
 * once a profile has loaded, and an effect keyed on a ref object would have
 * run once against `null` and never again. Holding the node in state re-runs
 * the effect the moment it appears.
 *
 * An IntersectionObserver rather than a scroll listener: no per-frame work, no
 * reading layout on every scroll event, and the browser does the maths. The
 * `rootMargin` inset accounts for the sticky header over the top of the
 * viewport.
 */
export function useScrolledPast(
  element: Element | null,
  rootMargin = '-64px 0px 0px 0px',
): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    // Absent in jsdom, and the app is correct without it — the condensed bar
    // simply never appears.
    if (!element || typeof IntersectionObserver !== 'function') {
      setPast(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Only count scrolling PAST it; an element below the fold is also
        // "not intersecting" and must not trigger the bar.
        setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, rootMargin]);

  return past;
}
