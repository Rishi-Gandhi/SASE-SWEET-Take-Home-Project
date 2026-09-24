import { describe, expect, it } from 'vitest';
import { buildSpectrum } from '../lib/spectrum';
import { makeRepo } from './fixtures';

const withLanguages = (...languages: Array<string | null>) =>
  languages.map((language) => makeRepo({ language }));

describe('buildSpectrum', () => {
  it('returns no segments when nothing has a primary language', () => {
    const spectrum = buildSpectrum(withLanguages(null, null));
    expect(spectrum.segments).toEqual([]);
    expect(spectrum.classified).toBe(0);
    expect(spectrum.total).toBe(2);
  });

  it('excludes unclassified repos from the denominator but not the total', () => {
    const spectrum = buildSpectrum(withLanguages('Go', 'Go', null, null));
    expect(spectrum.classified).toBe(2);
    expect(spectrum.total).toBe(4);
    expect(spectrum.segments[0]?.share).toBe(1);
  });

  it('ranks languages by repo count', () => {
    const spectrum = buildSpectrum(withLanguages('Go', 'Rust', 'Go', 'Go', 'Rust', 'C'));
    expect(spectrum.segments.map((segment) => segment.label)).toEqual(['Go', 'Rust', 'C']);
    expect(spectrum.segments.map((segment) => segment.count)).toEqual([3, 2, 1]);
  });

  it('caps at three named segments and folds the rest into Other', () => {
    const spectrum = buildSpectrum(withLanguages('Go', 'Rust', 'C', 'Zig', 'Elm'));
    expect(spectrum.segments).toHaveLength(4);
    const last = spectrum.segments[3]!;
    expect(last.label).toBe('Other');
    expect(last.isOther).toBe(true);
    expect(last.count).toBe(2);
  });

  it('names a single leftover language instead of calling it Other', () => {
    const spectrum = buildSpectrum(withLanguages('Go', 'Rust', 'C', 'Zig'));
    const last = spectrum.segments[3]!;
    expect(last.label).toBe('Zig');
    expect(last.isOther).toBe(false);
  });

  it('breaks count ties alphabetically so the order is deterministic', () => {
    const spectrum = buildSpectrum(withLanguages('Rust', 'Go'));
    expect(spectrum.segments.map((segment) => segment.label)).toEqual(['Go', 'Rust']);
  });

  it('produces shares that sum to one', () => {
    const spectrum = buildSpectrum(withLanguages('Go', 'Rust', 'C', 'Zig', 'Elm', 'Nim'));
    const sum = spectrum.segments.reduce((total, segment) => total + segment.share, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});
