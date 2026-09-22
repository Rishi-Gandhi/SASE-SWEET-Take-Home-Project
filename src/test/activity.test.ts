import { describe, expect, it } from 'vitest';
import { buildActivity } from '../lib/activity';
import { makeRepo } from './fixtures';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('buildActivity', () => {
  it('returns one bucket per month in the window, oldest first', () => {
    const activity = buildActivity([], 24, NOW);
    expect(activity.buckets).toHaveLength(24);
    expect(activity.buckets[0]?.key).toBe('2024-07');
    expect(activity.buckets[23]?.key).toBe('2026-06');
  });

  it('counts each repo into the month of its last push', () => {
    const activity = buildActivity(
      [
        makeRepo({ pushed_at: '2026-06-02T00:00:00Z' }),
        makeRepo({ pushed_at: '2026-06-28T00:00:00Z' }),
        makeRepo({ pushed_at: '2026-05-10T00:00:00Z' }),
      ],
      24,
      NOW,
    );
    const june = activity.buckets.find((b) => b.key === '2026-06');
    const may = activity.buckets.find((b) => b.key === '2026-05');
    expect(june?.count).toBe(2);
    expect(may?.count).toBe(1);
    expect(activity.total).toBe(3);
    expect(activity.max).toBe(2);
  });

  it('ignores pushes outside the window but still reports zero cleanly', () => {
    const activity = buildActivity([makeRepo({ pushed_at: '2015-01-01T00:00:00Z' })], 24, NOW);
    expect(activity.total).toBe(0);
    expect(activity.max).toBe(0);
    expect(activity.buckets.every((b) => b.level === 0)).toBe(true);
  });

  it('scales levels 1-4 against the busiest month, never 0 for a non-empty one', () => {
    const repos = [
      ...Array.from({ length: 8 }, () => makeRepo({ pushed_at: '2026-06-05T00:00:00Z' })),
      makeRepo({ pushed_at: '2026-04-05T00:00:00Z' }),
    ];
    const activity = buildActivity(repos, 24, NOW);
    expect(activity.buckets.find((b) => b.key === '2026-06')?.level).toBe(4);
    // A single repo against a max of eight still has to be visible.
    expect(activity.buckets.find((b) => b.key === '2026-04')?.level).toBe(1);
    expect(activity.buckets.find((b) => b.key === '2026-05')?.level).toBe(0);
  });

  it('keeps quiet months readable when one month is a huge outlier', () => {
    const repos = [
      // A bulk month: 200 repos all last pushed in June.
      ...Array.from({ length: 200 }, () => makeRepo({ pushed_at: '2026-06-05T00:00:00Z' })),
      ...Array.from({ length: 6 }, () => makeRepo({ pushed_at: '2026-05-05T00:00:00Z' })),
      ...Array.from({ length: 3 }, () => makeRepo({ pushed_at: '2026-03-05T00:00:00Z' })),
      makeRepo({ pushed_at: '2026-01-05T00:00:00Z' }),
    ];
    const activity = buildActivity(repos, 24, NOW);
    const at = (key: string) => activity.buckets.find((b) => b.key === key)?.level;

    // A linear scale against 200 would have flattened all three of these to 1.
    expect(at('2026-06')).toBe(4);
    expect(at('2026-05')).toBe(3);
    expect(at('2026-03')).toBe(2);
    expect(at('2026-01')).toBe(1);
  });

  it('skips repos with an unparseable timestamp instead of throwing', () => {
    const activity = buildActivity([makeRepo({ pushed_at: 'not-a-date' })], 24, NOW);
    expect(activity.total).toBe(0);
  });
});
