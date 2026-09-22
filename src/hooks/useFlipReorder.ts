import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

const DURATION = 420;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface Point {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * FLIP: First, Last, Invert, Play.
 *
 * React has already moved the cards to their new positions by the time this
 * runs, so we compare each card's new box against the one we recorded on the
 * previous commit, apply the inverse translation, and animate it away. The
 * browser only ever animates a transform, so a hundred cards reorder on the
 * compositor without a single layout pass.
 *
 * Positions are measured RELATIVE TO THE CONTAINER, not the viewport —
 * viewport coordinates shift when the page scrolls between commits, which
 * would make every card animate from the wrong place.
 */
export function useFlipReorder(
  containerRef: RefObject<HTMLElement | null>,
  /** Changing this is what triggers a reorder pass — pass the sort key. */
  trigger: string,
): void {
  const previous = useRef(new Map<string, Point>());
  const animations = useRef(new Map<string, Animation>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origin = container.getBoundingClientRect();
    const items = container.querySelectorAll<HTMLElement>('[data-flip-id]');
    const next = new Map<string, Point>();

    for (const element of items) {
      const id = element.dataset.flipId;
      if (!id) continue;

      const box = element.getBoundingClientRect();
      const point: Point = {
        left: box.left - origin.left,
        top: box.top - origin.top,
        width: box.width,
        height: box.height,
      };
      next.set(id, point);

      // No Web Animations API (older Safari, jsdom) means no animation —
      // the reorder still happens, it just arrives instantly.
      if (reduced || typeof element.animate !== 'function') continue;

      const before = previous.current.get(id);
      // A card that was not on screen last time has nothing to travel from.
      if (!before) continue;

      // A card that changed size is mid-relayout (it just became, or stopped
      // being, the principal). Translating it would only smear the resize.
      if (Math.abs(before.width - point.width) > 2 || Math.abs(before.height - point.height) > 2) {
        continue;
      }

      const dx = before.left - point.left;
      const dy = before.top - point.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      animations.current.get(id)?.cancel();
      const animation = element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: DURATION, easing: EASING },
      );
      animations.current.set(id, animation);
      animation.finished.then(
        () => animations.current.delete(id),
        () => animations.current.delete(id),
      );
    }

    previous.current = next;
  }, [containerRef, trigger]);
}
