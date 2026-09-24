import { useEffect } from 'react';
import type { RefObject } from 'react';
import { clamp } from '../lib/motion';

/**
 * Writes the pointer's position over `area` to `--tx`/`--ty` on `stage`, each
 * -1..1 from the stage's centre. The CSS turns those into the cube's tilt and
 * the rings' and pills' parallax, so moving the mouse never re-renders React.
 *
 * Mouse and pen only: touch has no hover, and a drag on a phone is a scroll.
 * Reads layout at most once per frame, however fast the pointer moves.
 */
export function usePointerTilt(
  areaRef: RefObject<HTMLElement | null>,
  stageRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const area = areaRef.current;
    const stage = stageRef.current;
    if (!enabled || !area || !stage) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const reset = () => {
      stage.style.setProperty('--tx', '0');
      stage.style.setProperty('--ty', '0');
    };

    const apply = () => {
      frame = 0;
      if (!pointer) return;
      const box = stage.getBoundingClientRect();
      const tx = clamp((pointer.x - (box.left + box.width / 2)) / (box.width / 2), -1, 1);
      const ty = clamp((pointer.y - (box.top + box.height / 2)) / (box.height / 2), -1, 1);
      stage.style.setProperty('--tx', tx.toFixed(3));
      stage.style.setProperty('--ty', ty.toFixed(3));
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      pointer = null;
      reset();
    };

    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      reset();
    };
  }, [areaRef, stageRef, enabled]);
}
