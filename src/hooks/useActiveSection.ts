import { useEffect, useState } from 'react';

/**
 * The id of the section crossing the middle of the viewport, for the top
 * bar's breadcrumb.
 *
 * The root margin shrinks the viewport to a thin band 45% from the top, so
 * exactly one section intersects at a time and the crumb changes as a section
 * passes the reader's eye line — not the moment its first pixel appears.
 * An IntersectionObserver rather than a scroll listener: no per-frame work.
 */
export function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    // Absent in jsdom; the crumb simply stays on the first section.
    if (typeof IntersectionObserver !== 'function') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}
