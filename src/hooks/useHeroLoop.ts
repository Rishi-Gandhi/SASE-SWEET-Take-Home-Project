import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** The hero's 13.4s cycle, in ms from the start of each loop. */
export const HERO_TIMELINE = {
  /** The cube dims from glowing glass to dark glass. */
  unlight: 2300,
  /** The pills pop in around the rings, one after another. */
  showPills: 2900,
  /** A highlight starts travelling from pill to pill… */
  highlightStart: 4600,
  /** …moving on this often… */
  highlightStep: 480,
  /** …until it stops and every pill's icon fills with the accent. */
  activate: 7700,
  /** The pills leave, in reverse order. */
  hidePills: 10200,
  /** The cube lights up again. */
  relight: 11000,
  /** And round again. */
  restart: 13400,
} as const;

export interface HeroFrame {
  lit: boolean;
  mapped: boolean;
  active: boolean;
  /** Which pill carries the travelling highlight, if any. */
  hot: number | null;
}

const START: HeroFrame = { lit: true, mapped: false, active: false, hot: null };
/** Reduced motion: no loop — the whole picture at once, holding still. */
const STILL: HeroFrame = { lit: true, mapped: true, active: true, hot: null };
/** While a profile loads: the cube stays lit and the skeleton pills stay out. */
const HOLD: HeroFrame = { lit: true, mapped: true, active: false, hot: null };

interface Options {
  /** How many pills the highlight travels around, in ranking order. */
  pillCount: number;
  /** Changing this restarts from the top, so new pills pop in fresh. */
  restartKey: unknown;
  /** Freeze on the loading frame. */
  hold: boolean;
  reducedMotion: boolean;
}

/**
 * Drives the hero's state classes along HERO_TIMELINE.
 *
 * It only runs while the hero is on screen and the tab is visible: every
 * timer is cleared the moment either stops being true, and the loop starts
 * again from the top when they return.
 */
export function useHeroLoop(
  heroRef: RefObject<Element | null>,
  { pillCount, restartKey, hold, reducedMotion }: Options,
): HeroFrame {
  const [frame, setFrame] = useState<HeroFrame>(START);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const hero = heroRef.current;
    // Absent in jsdom: the hero then holds its first frame, which is correct.
    if (!hero || typeof IntersectionObserver !== 'function') return;

    // Starts at 15% visible, stops only once it has left entirely. Reading
    // the ratio matters: `isIntersecting` is true for any sliver at all.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.intersectionRatio >= 0.15) setOnScreen(true);
        else if (!entry.isIntersecting) setOnScreen(false);
      },
      { threshold: [0, 0.15] },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [heroRef]);

  useEffect(() => {
    const onChange = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const running = onScreen && tabVisible && !hold && !reducedMotion;

  useEffect(() => {
    if (!running) return;

    const timers: number[] = [];
    let highlight = 0;
    const at = (ms: number, apply: () => void) => {
      timers.push(window.setTimeout(apply, ms));
    };

    const cycle = () => {
      // Everything from the previous cycle has fired by the time it restarts.
      timers.length = 0;
      setFrame(START);
      at(HERO_TIMELINE.unlight, () => setFrame((f) => ({ ...f, lit: false })));
      at(HERO_TIMELINE.showPills, () => setFrame((f) => ({ ...f, mapped: true })));
      at(HERO_TIMELINE.highlightStart, () => {
        let step = 0;
        highlight = window.setInterval(() => {
          setFrame((f) => ({ ...f, hot: pillCount > 0 ? step % pillCount : null }));
          step += 1;
        }, HERO_TIMELINE.highlightStep);
      });
      at(HERO_TIMELINE.activate, () => {
        window.clearInterval(highlight);
        setFrame((f) => ({ ...f, hot: null, active: true }));
      });
      at(HERO_TIMELINE.hidePills, () => setFrame((f) => ({ ...f, mapped: false })));
      at(HERO_TIMELINE.relight, () => setFrame((f) => ({ ...f, active: false, lit: true })));
      at(HERO_TIMELINE.restart, cycle);
    };

    cycle();
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearInterval(highlight);
    };
  }, [running, restartKey, pillCount]);

  if (reducedMotion) return STILL;
  if (hold) return HOLD;
  return frame;
}
