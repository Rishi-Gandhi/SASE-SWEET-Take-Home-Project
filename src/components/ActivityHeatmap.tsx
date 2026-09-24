import type { Activity } from '../lib/activity';

interface Props {
  activity: Activity;
}

const RAMP = ['var(--ramp-0)', 'var(--ramp-1)', 'var(--ramp-2)', 'var(--ramp-3)', 'var(--ramp-4)'];

/**
 * Sequential magnitude, so: one hue, dark to light, with a scale legend.
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
    <section aria-labelledby="activity-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="activity-heading" className="label">
          Last push by month
        </h3>
        <p className="label text-muted">
          {activity.total} repos · peak {activity.max} in one month
        </p>
      </div>

      <div className="mt-2.5 flex h-6 items-stretch gap-[3px]">
        {activity.buckets.map((bucket) => (
          <div
            key={bucket.key}
            title={`${bucket.label} ${bucket.year}: ${bucket.count} ${bucket.count === 1 ? 'repo' : 'repos'} last pushed`}
            className="flex-1 rounded-[3px] transition-colors duration-300"
            style={{ background: RAMP[bucket.level] }}
          >
            <span className="sr-only">
              {bucket.label} {bucket.year}: {bucket.count} repositories
            </span>
          </div>
        ))}
      </div>

      {/* Year boundaries as ticks under the scale. */}
      <div className="mt-1 flex gap-[3px]" aria-hidden="true">
        {ticks.map((year, index) => (
          <div key={activity.buckets[index]?.key ?? index} className="flex-1">
            {year !== null && (
              <span className="block border-l border-faint pl-1 font-mono text-[10px] text-muted">{year}</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Fewer</span>
        {RAMP.map((step) => (
          <span key={step} className="size-2.5 rounded-[3px]" style={{ background: step }} />
        ))}
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">More</span>
      </div>
    </section>
  );
}
