import type { Activity } from '../lib/activity';

interface Props {
  activity: Activity;
}

const RAMP = ['var(--ramp-0)', 'var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];

/**
 * Sequential magnitude, so: one hue, light to dark, with a scale legend.
 *
 * Each cell is one month, shaded by how many repositories were last pushed in
 * it. That is what the repos endpoint can honestly support — it returns one
 * timestamp per repo, not a commit history — so the caption says exactly that
 * rather than implying this is a contribution graph.
 */
export function ActivityHeatmap({ activity }: Props) {
  if (activity.total === 0) return null;

  // A year tick wherever the year changes, so the axis is readable without
  // labelling all 24 cells.
  const ticks = activity.buckets.map((bucket, index) => {
    const previous = activity.buckets[index - 1];
    return !previous || previous.year !== bucket.year ? bucket.year : null;
  });

  return (
    <section aria-labelledby="activity-heading" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="activity-heading" className="label">
          Last push by month
        </h3>
        <p className="font-mono text-[10px] text-ink-3">
          {activity.total} repos · peak {activity.max} in one month
        </p>
      </div>

      <div className="mt-2 flex h-7 items-stretch gap-[2px]">
        {activity.buckets.map((bucket) => (
          <div
            key={bucket.key}
            title={`${bucket.label} ${bucket.year}: ${bucket.count} ${bucket.count === 1 ? 'repo' : 'repos'} last pushed`}
            className="flex-1 rounded-[1px] transition-colors duration-300"
            style={{ background: RAMP[bucket.level] }}
          >
            <span className="sr-only">
              {bucket.label} {bucket.year}: {bucket.count} repositories
            </span>
          </div>
        ))}
      </div>

      {/* Year boundaries as drafting ticks under the scale. */}
      <div className="mt-1 flex gap-[2px]" aria-hidden="true">
        {ticks.map((year, index) => (
          <div key={activity.buckets[index]?.key ?? index} className="flex-1">
            {year !== null && (
              <span className="block border-l border-line pl-1 font-mono text-[9px] text-ink-3">
                {year}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">Fewer</span>
        {RAMP.map((step, index) => (
          <span
            key={step}
            aria-hidden="true"
            className="size-2.5 rounded-[1px]"
            style={{ background: step, outline: index === 0 ? '1px solid var(--line)' : 'none' }}
          />
        ))}
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">More</span>
      </div>
    </section>
  );
}
