import { clamp, easeInOutCubic, lerp } from './motion';

/**
 * Where each step's cube starts, in cube sizes from the stage centre: a loose
 * scatter that scrolling pulls into one stack.
 */
export const SCATTER: ReadonlyArray<readonly [number, number]> = [
  [-2.3, -0.9],
  [2.0, -1.8],
  [0.9, 1.35],
];

/**
 * Vertical distance between stacked isometric cubes, in cube sizes. Tipped
 * 35.26° forward, a cube's vertical edge projects to cos(35.26°) ≈ 0.816 of
 * its length on screen — stack them that far apart and each one sits exactly
 * on the one below.
 */
export const ISO_STACK_STEP = 0.816;

/** Room a step's label needs beside its cube: the number chip, a gap, a short title. */
const LABEL_ROOM = 120;

/**
 * How far the scatter may spread sideways, 0.3..1. At full spread the
 * right-hand cube sits two cube-widths off centre, which on a phone leaves
 * its label no room before the screen edge; narrowing the spread keeps every
 * label on screen while the stack still assembles top to bottom.
 */
export function scatterSpread(stageWidth: number, size: number): number {
  const widestX = Math.max(...SCATTER.map(([x]) => x)) * size;
  return clamp((stageWidth / 2 - size * 0.78 - LABEL_ROOM) / widestX, 0.3, 1);
}

/** 0 while the section's top is at the viewport's top, 1 once its bottom arrives. */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  return clamp(-sectionTop / Math.max(1, sectionHeight - viewportHeight), 0, 1);
}

export interface StepPose {
  /** Where the cube is now, in px from the stage centre. */
  x: number;
  y: number;
  /** Where it will sit once stacked. */
  stackedY: number;
  /** The dashed blueprint guide between the stacked spot and the current one. */
  guide: { left: number; top: number; width: number; height: number; opacity: number };
}

export interface Assembly {
  active: 0 | 1 | 2;
  steps: StepPose[];
}

/**
 * The whole scroll choreography as a pure function of progress (0..1):
 *
 *   5% → 55%   the scattered cubes ease into one stack, guides fading out
 *   72% → 98%  the stack opens into an exploded view, half a cube apart
 *   36%, 64%   the highlighted step moves on
 */
export function assemble(progress: number, size: number, spread = 1): Assembly {
  const t = easeInOutCubic(clamp((progress - 0.05) / 0.5, 0, 1));
  const exploded = easeInOutCubic(clamp((progress - 0.72) / 0.26, 0, 1));

  const steps = SCATTER.map(([scatterX, scatterY], i): StepPose => {
    const stackedY = (i - 1) * (ISO_STACK_STEP + 0.5 * exploded) * size;
    const x = lerp(scatterX * spread * size, 0, t);
    const y = lerp(scatterY * size, stackedY, t);
    return {
      x,
      y,
      stackedY,
      guide: {
        left: Math.min(0, x),
        top: Math.min(stackedY, y),
        width: Math.abs(x),
        height: Math.abs(y - stackedY),
        opacity: (1 - t) * 0.8,
      },
    };
  });

  return { active: progress < 0.36 ? 0 : progress < 0.64 ? 1 : 2, steps };
}
