import type { GitHubRepo } from '../types';

export interface ActivityBucket {
  /** Sort key, `YYYY-MM`. */
  key: string;
  /** Short label for the axis, e.g. "Mar". */
  label: string;
  year: number;
  /** Repositories whose most recent push landed in this month. */
  count: number;
  /** 0 (none) to 4 (busiest), for the sequential colour ramp. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface Activity {
  buckets: ActivityBucket[];
  max: number;
  total: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Quartiles of the NON-ZERO months, which is how GitHub's own contribution
 * graph scales. A linear scale against the maximum looks correct and is
 * useless in practice: one bulk month of 400 dependency bumps drags every
 * other month down to the same bottom step, and the chart stops saying
 * anything. Ranking against the distribution keeps the quiet months readable
 * and still puts the outlier at the top.
 */
function thresholds(counts: number[]): [number, number, number] {
  const nonZero = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (nonZero.length === 0) return [0, 0, 0];
  const at = (p: number) => nonZero[Math.floor((nonZero.length - 1) * p)] ?? 0;
  return [at(0.25), at(0.5), at(0.75)];
}

function level(count: number, [t1, t2, t3]: [number, number, number]): ActivityBucket['level'] {
  if (count === 0) return 0;
  if (count <= t1) return 1;
  if (count <= t2) return 2;
  if (count <= t3) return 3;
  return 4;
}

/**
 * Buckets each repository by the month of its LAST push.
 *
 * This is deliberately not a commit heatmap — the repos endpoint gives one
 * timestamp per repository, not a commit history, and pretending otherwise
 * would be a lie dressed as a graph. What it does show honestly is when this
 * account's work came in waves: a tall month is a month a lot of projects were
 * last touched. Every repo we hold is counted; nothing extra is fetched.
 */
export function buildActivity(repos: GitHubRepo[], months = 24, now: Date = new Date()): Activity {
  const counts = new Map<string, number>();

  for (const repo of repos) {
    const pushed = new Date(repo.pushed_at);
    if (Number.isNaN(pushed.getTime())) continue;
    const key = `${pushed.getUTCFullYear()}-${String(pushed.getUTCMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const buckets: ActivityBucket[] = [];
  let max = 0;
  let total = 0;

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const count = counts.get(key) ?? 0;

    max = Math.max(max, count);
    total += count;
    buckets.push({ key, label: MONTH_LABELS[month] ?? '', year, count, level: 0 });
  }

  // Levels need the whole window's distribution, so they are a second pass.
  const cuts = thresholds(buckets.map((bucket) => bucket.count));

  return {
    buckets: buckets.map((bucket) => ({ ...bucket, level: level(bucket.count, cuts) })),
    max,
    total,
  };
}
