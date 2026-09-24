import { describe, expect, it } from 'vitest';
import { clamp, easeInOutCubic, lerp } from '../lib/motion';

describe('motion helpers', () => {
  it('clamps into range', () => {
    expect(clamp(-2, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
    expect(clamp(5, 0, 1)).toBe(1);
  });

  it('interpolates linearly', () => {
    expect(lerp(-184, 0, 0)).toBe(-184);
    expect(lerp(-184, 0, 0.5)).toBe(-92);
    expect(lerp(-184, 0, 1)).toBe(0);
  });

  it('eases symmetrically through the midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeCloseTo(1 - easeInOutCubic(0.75), 10);
    // Slow at the ends: the first quarter covers well under a quarter.
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
  });
});
