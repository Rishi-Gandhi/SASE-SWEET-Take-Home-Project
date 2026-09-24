import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';
import { scrollProgress } from '../lib/howItWorks';

/**
 * Reports how far the page has scrolled through a section, 0..1.
 *
 * The first measurement is synchronous, before paint, so whatever it drives
 * never flashes in a wrong position. After that it is at most once per
 * animation frame, and only while the section is on screen; one last
 * measurement on the way out lets the picture settle fully assembled (or
 * fully scattered) however fast the reader flicked past.
 */
export function useSectionProgress(
  sectionRef: RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void,
): void {
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = section.getBoundingClientRect();
      onProgress(scrollProgress(box.top, box.height, window.innerHeight || 800));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const listen = () => {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
    };
    const unlisten = () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    measure();

    // Without an IntersectionObserver (jsdom), listen all the time.
    if (typeof IntersectionObserver !== 'function') {
      listen();
      return unlisten;
    }

    let listening = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting && !listening) {
        listening = true;
        listen();
        measure();
      } else if (!entry.isIntersecting && listening) {
        listening = false;
        unlisten();
        measure();
      }
    });
    observer.observe(section);

    return () => {
      observer.disconnect();
      unlisten();
    };
  }, [sectionRef, onProgress]);
}
