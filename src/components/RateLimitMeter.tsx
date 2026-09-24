import { useRateLimit } from '../hooks/useRateLimit';
import { timeUntil } from '../lib/format';

/**
 * A single ratio against a limit, so this is a meter rather than a chart.
 * The status colours (warning, critical) are deliberately separate from the
 * accent, so "running low" reads as a state rather than as emphasis.
 */
export function RateLimitMeter() {
  const rate = useRateLimit();
  if (!rate) return null;

  const ratio = Math.max(0, Math.min(1, rate.remaining / rate.limit));
  const low = ratio <= 0.2;
  const empty = rate.remaining === 0;

  const fill = empty ? 'var(--critical)' : low ? 'var(--warning)' : 'var(--accent-2)';

  return (
    <div className="flex items-center gap-2.5">
      <span className="label text-muted">API</span>

      <div
        role="meter"
        aria-valuenow={rate.remaining}
        aria-valuemin={0}
        aria-valuemax={rate.limit}
        aria-label={`${rate.remaining} of ${rate.limit} GitHub requests remaining this hour`}
        className="h-1.5 w-20 overflow-hidden rounded-full bg-input"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${ratio * 100}%`, background: fill }}
        />
      </div>

      <span className="font-mono text-[12px] tabular-nums text-fg">
        {rate.remaining}/{rate.limit}
      </span>

      {/* The reset time only matters once the budget is actually tight. */}
      {low && (
        <span className="font-mono text-[12px]" style={{ color: empty ? 'var(--critical)' : 'var(--warning)' }}>
          resets {timeUntil(rate.resetAt)}
        </span>
      )}
    </div>
  );
}
