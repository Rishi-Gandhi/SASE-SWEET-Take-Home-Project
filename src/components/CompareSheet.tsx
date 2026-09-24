import type { CSSProperties } from 'react';
import type { Profile } from '../types';
import type { Comparison } from '../lib/compare';
import { compactNumber, exactNumber } from '../lib/format';

interface Props {
  a: Profile;
  b: Profile;
  comparison: Comparison;
  onStop: () => void;
}

/* Two lightnesses of one hue. Lightness is the only channel every form of
   colour-vision deficiency preserves, so a light/dark pair is the most
   robust two-series encoding available — and both are labelled regardless. */
const SHADE_A = 'var(--series-a)';
const SHADE_B = 'var(--series-b)';

function Identity({ profile, shade }: { profile: Profile; shade: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        src={profile.user.avatar_url}
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-[10px] border border-panel-line object-cover"
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: shade }} />
          <a
            href={profile.user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-display text-[15px] font-semibold text-fg underline decoration-transparent underline-offset-4 transition-colors hover:decoration-accent"
          >
            @{profile.user.login}
          </a>
        </div>
        <p className="truncate text-[13px] text-muted">{profile.user.name ?? profile.user.login}</p>
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
  const mark = 'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2';

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="label">{metric.label}</span>
        <span className="font-mono text-[12px] tabular-nums text-muted">
          <span title={`${exactNumber(metric.a)} — @${loginA}`} className="text-fg">
            {compactNumber(metric.a)}
          </span>
          <span className="mx-1.5">vs</span>
          <span title={`${exactNumber(metric.b)} — @${loginB}`} className="text-fg">
            {compactNumber(metric.b)}
          </span>
        </span>
      </div>

      <div className="relative mt-2 h-4">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-faint" />
        {/* The connecting segment is the difference — the reason to look. */}
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-muted/60"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        <span
          className={mark}
          style={{ left: `${pctA}%`, background: SHADE_A, '--tw-ring-color': 'var(--panel)' } as CSSProperties}
        />
        <span
          className={mark}
          style={{ left: `${pctB}%`, background: SHADE_B, '--tw-ring-color': 'var(--panel)' } as CSSProperties}
        />
      </div>
    </div>
  );
}

function Chips({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h4 className="label">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-panel-line px-2.5 py-1 font-mono text-[11px] text-muted"
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
    <section className="panel enter mt-8 p-5 sm:p-6" aria-labelledby="compare-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="compare-heading" className="label">
          Comparison
          <em>
            @{a.user.login} vs @{b.user.login}
          </em>
        </h3>
        <button type="button" onClick={onStop} className="chip">
          Stop comparing
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Identity profile={a} shade={SHADE_A} />
        <Identity profile={b} shade={SHADE_B} />
      </div>

      {/* One column on purpose. In two columns these sat directly under the
          two identity blocks, which read as "the left metric belongs to the
          left account" — a misreading the full-width form cannot produce. */}
      <div className="mt-6 grid gap-y-5">
        {comparison.metrics.map((metric) => (
          <Dumbbell key={metric.label} metric={metric} loginA={a.user.login} loginB={b.user.login} />
        ))}
      </div>

      <p className="mt-5 border-t border-dashed border-panel-line pt-3 text-[13px] text-muted">
        Each row is scaled to its own larger value — repos and stars differ by orders of magnitude, so
        one shared axis would invent a relationship that is not in the data.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Chips title="Languages in common" items={comparison.sharedLanguages} empty="No overlap in primary languages." />
        <Chips title="Topics in common" items={comparison.sharedTopics} empty="No shared topics." />
      </div>

      <p className="mt-5 text-[13px] text-muted">
        Comparing costs twice the API budget — both accounts are cached once loaded.
      </p>
    </section>
  );
}
