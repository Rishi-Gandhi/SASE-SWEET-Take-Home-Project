import { describe, expect, it } from 'vitest';
import { compactNumber, exactNumber, timeUntil } from '../lib/format';

describe('compactNumber', () => {
  it('leaves counts under a thousand alone', () => {
    expect(compactNumber(0)).toBe('0');
    expect(compactNumber(999)).toBe('999');
  });

  it('writes thousands with an SI lowercase k', () => {
    expect(compactNumber(1000)).toBe('1k');
    expect(compactNumber(2418)).toBe('2.4k');
    expect(compactNumber(203118)).toBe('203.1k');
  });

  it('keeps the capital M for millions', () => {
    expect(compactNumber(1_250_000)).toBe('1.3M');
  });
});

describe('exactNumber', () => {
  it('groups thousands for the full counts on cards', () => {
    expect(exactNumber(2418)).toBe('2,418');
  });
});

describe('timeUntil', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('rounds up to whole minutes and never reads negative', () => {
    expect(timeUntil(new Date('2026-01-01T12:29:10Z'), now)).toBe('in about 30 minutes');
    expect(timeUntil(new Date('2026-01-01T11:00:00Z'), now)).toBe('any moment now');
  });
});
