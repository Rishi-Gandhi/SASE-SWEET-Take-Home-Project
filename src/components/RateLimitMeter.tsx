import { useRateLimit } from '../hooks/useRateLimit';
import { timeUntil } from '../lib/format';

/**
 * A single ratio against a limit, so this is a meter rather than a chart.
 * The track and fill come from the same ramp; the status colours (warning,
 * critical) are deliberately separate from the accent so "running low" reads
 * as a state rather than as emphasis.
 */
export function RateLimitMeter() {
  const rate = useRateLimit();
  if (!rate) return null;

  const ratio = Math.max(0, Math.min(1, rate.remaining / rate.limit));
  const low = ratio <= 0.2;
  const empty = rate.remaining === 0;

  const fill = empty ? 'var(--critical)' : low ? 'var(--warning)' : 'var(--accent)';

  return (
    <div className="flex items-center gap-2.5">
      <span className="label">API</span>

      <div
        role="meter"
        aria-valuenow={rate.remaining}
        aria-valuemin={0}
        aria-valuemax={rate.limit}
        aria-label={`${rate.remaining} of ${rate.limit} GitHub requests remaining this hour`}
        className="h-[5px] w-20 overflow-hidden rounded-[1px] bg-inset"
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%`, background: fill }}
        />
      </div>

      <span className="font-mono text-[11px] tabular-nums text-ink-2">
        {rate.remaining}/{rate.limit}
      </span>

      {/* The reset time only matters once the budget is actually tight. */}
      {low && (
        <span className="font-mono text-[11px]" style={{ color: empty ? 'var(--critical)' : 'var(--warning)' }}>
          resets {timeUntil(rate.resetAt)}
        </span>
      )}
    </div>
  );
}
