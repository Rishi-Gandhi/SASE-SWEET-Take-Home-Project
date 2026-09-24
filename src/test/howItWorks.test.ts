import { describe, expect, it } from 'vitest';
import { ISO_STACK_STEP, assemble, scatterSpread, scrollProgress } from '../lib/howItWorks';

describe('scrollProgress', () => {
  it('runs from 0 at the top of the section to 1 at its end', () => {
    // A 2800px section in an 800px viewport has 2000px of scroll.
    expect(scrollProgress(0, 2800, 800)).toBe(0);
    expect(scrollProgress(-1000, 2800, 800)).toBe(0.5);
    expect(scrollProgress(-2000, 2800, 800)).toBe(1);
  });

  it('clamps before and after the section', () => {
    expect(scrollProgress(500, 2800, 800)).toBe(0);
    expect(scrollProgress(-9000, 2800, 800)).toBe(1);
  });

  it('never divides by zero when the section is no taller than the viewport', () => {
    expect(scrollProgress(0, 800, 800)).toBe(0);
    expect(scrollProgress(-50, 600, 800)).toBe(1);
  });
});

describe('assemble', () => {
  const size = 80;
  const ys = (progress: number) => assemble(progress, size).steps.map((step) => step.y);

  it('starts scattered, with the blueprint guides showing', () => {
    const { steps, active } = assemble(0, size);
    expect(steps[0]?.x).toBeCloseTo(-2.3 * size);
    expect(steps[0]?.y).toBeCloseTo(-0.9 * size);
    expect(steps[1]?.x).toBeCloseTo(2.0 * size);
    expect(steps.every((step) => step.guide.opacity === 0.8)).toBe(true);
    expect(active).toBe(0);
  });

  it('is a single stack by 55%, each cube exactly on the one below', () => {
    const { steps } = assemble(0.55, size);
    expect(steps.map((step) => step.x)).toEqual([0, 0, 0]);
    expect(steps[0]?.y).toBeCloseTo(-ISO_STACK_STEP * size);
    expect(steps[1]?.y).toBeCloseTo(0);
    expect(steps[2]?.y).toBeCloseTo(ISO_STACK_STEP * size);
    expect(steps.every((step) => step.guide.opacity === 0)).toBe(true);
  });

  it('opens into an exploded view at the end', () => {
    const spread = (ISO_STACK_STEP + 0.5) * size;
    expect(ys(1)[0]).toBeCloseTo(-spread);
    expect(ys(1)[2]).toBeCloseTo(spread);
    // Stacked but not yet exploded in between.
    expect(ys(0.7)[2]).toBeCloseTo(ISO_STACK_STEP * size);
  });

  it('keeps step 01 at the top of the stack', () => {
    for (const progress of [0.6, 0.8, 1]) {
      const [first, second, third] = ys(progress);
      expect(first).toBeLessThan(second!);
      expect(second).toBeLessThan(third!);
    }
  });

  it('draws each guide from the stacked spot to the current one', () => {
    const { steps } = assemble(0.2, size);
    const pose = steps[1]!;
    expect(pose.guide.left).toBe(Math.min(0, pose.x));
    expect(pose.guide.width).toBeCloseTo(Math.abs(pose.x));
    expect(pose.guide.top).toBeCloseTo(Math.min(pose.stackedY, pose.y));
    expect(pose.guide.height).toBeCloseTo(Math.abs(pose.y - pose.stackedY));
  });

  it('moves the highlighted step on at 36% and 64%', () => {
    expect(assemble(0.35, size).active).toBe(0);
    expect(assemble(0.36, size).active).toBe(1);
    expect(assemble(0.63, size).active).toBe(1);
    expect(assemble(0.64, size).active).toBe(2);
  });
});

describe('scatterSpread', () => {
  it('uses the full scatter on a desktop stage', () => {
    expect(scatterSpread(900, 84)).toBe(1);
    expect(scatterSpread(768, 58)).toBe(1);
  });

  it('narrows on a phone, but never below 0.3', () => {
    const phone = scatterSpread(375, 58);
    expect(phone).toBeGreaterThanOrEqual(0.3);
    expect(phone).toBeLessThan(1);
  });

  it('only narrows the sideways scatter; the stack is unchanged', () => {
    const wide = assemble(0, 58, 1).steps[1]!;
    const narrow = assemble(0, 58, 0.3).steps[1]!;
    expect(narrow.x).toBeCloseTo(wide.x * 0.3);
    expect(narrow.y).toBeCloseTo(wide.y);
    expect(assemble(0.6, 58, 0.3).steps.map((step) => step.x)).toEqual([0, 0, 0]);
  });
});
