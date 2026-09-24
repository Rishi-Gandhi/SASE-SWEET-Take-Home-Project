import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

const ADVANCE_EVERY_MS = 4200;
const PAUSE_AFTER_INTERACTION_MS = 8000;
const SETTLE_MS = 90;

/**
 * A scroll-snap carousel's behaviour. The track does the scrolling, snapping
 * and dragging natively; this adds the "active" slide, buttons and arrow
 * keys, and auto-advance.
 *
 * Auto-advance runs only while 40% of the track is on screen and the tab is
 * visible. It waits 8s after any touch of the carousel, holds while the
 * pointer rests on it, never runs under reduced motion, and can be switched
 * off outright — moving content needs a way to stop it (WCAG 2.2.2).
 *
 * Slides are found by `[data-slide]`, and the track must be positioned so a
 * slide's offsetLeft is measured from it.
 */
export function useCarousel(
  trackRef: RefObject<HTMLElement | null>,
  { count, reducedMotion }: { count: number; reducedMotion: boolean },
) {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [inView, setInView] = useState(false);
  // Timers read these, so they live in refs rather than state.
  const activeRef = useRef(0);
  const hovering = useRef(false);
  const pausedUntil = useRef(0);

  const slides = useCallback(
    () => Array.from(trackRef.current?.querySelectorAll<HTMLElement>('[data-slide]') ?? []),
    [trackRef],
  );

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const next = ((index % count) + count) % count;
      const slide = slides()[next];
      if (!slide) return;
      activeRef.current = next;
      setActive(next);
      track.scrollTo?.({
        left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    },
    [trackRef, count, slides, reducedMotion],
  );

  const pause = useCallback(() => {
    pausedUntil.current = Date.now() + PAUSE_AFTER_INTERACTION_MS;
  }, []);

  // Whichever slide sits nearest the centre once scrolling settles is active,
  // however it got there: buttons, keys, a drag, a swipe, or a trackpad.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let settle = 0;
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const middle = track.scrollLeft + track.clientWidth / 2;
        let nearest = 0;
        let distance = Infinity;
        slides().forEach((slide, index) => {
          const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
          if (d < distance) {
            distance = d;
            nearest = index;
          }
        });
        if (nearest !== activeRef.current) {
          activeRef.current = nearest;
          setActive(nearest);
        }
      }, SETTLE_MS);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(settle);
      track.removeEventListener('scroll', onScroll);
    };
  }, [trackRef, slides]);

  // Any hand on the carousel holds auto-advance off for a while.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const enter = () => {
      hovering.current = true;
    };
    const leave = () => {
      hovering.current = false;
    };
    const events = ['pointerdown', 'wheel', 'touchstart', 'focusin'] as const;
    events.forEach((name) => track.addEventListener(name, pause, { passive: true }));
    track.addEventListener('pointerenter', enter);
    track.addEventListener('pointerleave', leave);
    return () => {
      events.forEach((name) => track.removeEventListener(name, pause));
      track.removeEventListener('pointerenter', enter);
      track.removeEventListener('pointerleave', leave);
    };
  }, [trackRef, pause]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver !== 'function') return;
    // The ratio, not isIntersecting, which is true for any sliver at all.
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry && entry.intersectionRatio >= 0.4)),
      { threshold: [0, 0.4] },
    );
    observer.observe(track);
    return () => observer.disconnect();
  }, [trackRef]);

  useEffect(() => {
    if (reducedMotion || !autoplay || !inView || count < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || hovering.current || Date.now() < pausedUntil.current) return;
      goTo(activeRef.current + 1);
    }, ADVANCE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [reducedMotion, autoplay, inView, count, goTo]);

  const prev = useCallback(() => {
    pause();
    goTo(activeRef.current - 1);
  }, [goTo, pause]);

  const next = useCallback(() => {
    pause();
    goTo(activeRef.current + 1);
  }, [goTo, pause]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    },
    [next, prev],
  );

  return {
    active,
    prev,
    next,
    onKeyDown,
    autoplay: autoplay && !reducedMotion,
    toggleAutoplay: () => setAutoplay((on) => !on),
  };
}
