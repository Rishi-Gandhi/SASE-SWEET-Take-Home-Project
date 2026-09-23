import type { Profile } from '../types';
import type { Comparison } from '../lib/compare';
import { compactNumber, exactNumber } from '../lib/format';
import { ArrowOutIcon } from './icons';

interface Props {
  a: Profile;
  b: Profile;
  comparison: Comparison;
  onStop: () => void;
}

/* Two shades of the one sequential hue. Lightness is the only channel every
   form of colour-vision deficiency preserves, so a light/dark pair is the most
   robust two-series encoding available — and both are labelled regardless. */
const SHADE_A = 'var(--ramp-4)';
const SHADE_B = 'var(--ramp-2)';

function Identity({ profile, shade }: { profile: Profile; shade: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <img
        src={profile.user.avatar_url}
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-[2px] border border-line object-cover"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-[1px]" style={{ background: shade }} />
          <a
            href={profile.user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[13px] text-ink hover:text-accent hover:underline"
          >
            @{profile.user.login}
          </a>
        </div>
        <p className="truncate font-display text-[13px] text-ink-2">
          {profile.user.name ?? profile.user.login}
        </p>
      </div>
    </div>
  );
}

/**
 * A dumbbell per metric: one track, two marks, the gap between them being the
 * whole point. Values are printed in the row header rather than beside the
 * marks, so two close figures can never overlap each other.
 */
function Dumbbell({ metric, loginA, loginB }: { metric: Comparison['metrics'][number]; loginA: string; loginB: string }) {
  const pctA = (metric.a / metric.max) * 100;
  const pctB = (metric.b / metric.max) * 100;
  const left = Math.min(pctA, pctB);
  const right = Math.max(pctA, pctB);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="label">{metric.label}</span>
        <span className="font-mono text-[11px] tabular-nums text-ink-2">
          <span title={`${exactNumber(metric.a)} — @${loginA}`}>{compactNumber(metric.a)}</span>
          <span className="mx-1.5 text-ink-3">vs</span>
          <span title={`${exactNumber(metric.b)} — @${loginB}`}>{compactNumber(metric.b)}</span>
        </span>
      </div>

      <div className="relative mt-2 h-3.5">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        {/* The connecting segment is the difference — the reason to look. */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-line-strong"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          style={{ left: `${pctA}%`, background: SHADE_A, '--tw-ring-color': 'var(--surface)' } as React.CSSProperties}
        />
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          style={{ left: `${pctB}%`, background: SHADE_B, '--tw-ring-color': 'var(--surface)' } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

function Chips({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="label">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1.5 font-mono text-[11px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-[2px] border border-line px-1.5 py-px font-mono text-[10px] text-ink-2"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CompareSheet({ a, b, comparison, onStop }: Props) {
  return (
    <section className="sheet bp-corners deck-rise mt-4 p-5 sm:p-6" aria-labelledby="compare-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="compare-heading" className="label">
          Sheet 02 — Comparison
        </p>
        <button
          type="button"
          onClick={onStop}
          className="cursor-pointer rounded-[2px] border border-line px-2 py-1 font-mono text-[11px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          Stop comparing
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Identity profile={a} shade={SHADE_A} />
        <Identity profile={b} shade={SHADE_B} />
      </div>

      {/* One column on purpose. In two columns these sat directly under the
          two identity blocks, which read as "the left metric belongs to the
          left account" — a misreading the full-width form cannot produce. */}
      <div className="mt-6 grid gap-y-5">
        {comparison.metrics.map((metric) => (
          <Dumbbell
            key={metric.label}
            metric={metric}
            loginA={a.user.login}
            loginB={b.user.login}
          />
        ))}
      </div>

      <p className="mt-5 border-t border-dashed border-line pt-3 font-mono text-[10px] text-ink-3">
        Each row is scaled to its own larger value — repos and stars differ by orders of magnitude,
        so one shared axis would invent a relationship that is not in the data.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Chips
          title="Languages in common"
          items={comparison.sharedLanguages}
          empty="No overlap in primary languages."
        />
        <Chips
          title="Topics in common"
          items={comparison.sharedTopics}
          empty="No shared topics."
        />
      </div>

      <p className="mt-5 flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
        <ArrowOutIcon className="size-3" />
        Comparing costs twice the API budget — both accounts are cached once loaded.
      </p>
    </section>
  );
}
