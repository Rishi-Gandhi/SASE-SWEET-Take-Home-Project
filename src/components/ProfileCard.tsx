import { useState } from 'react';
import type { Profile } from '../types';
import type { Spectrum } from '../lib/spectrum';
import type { Activity } from '../lib/activity';
import { absoluteDate, compactNumber, exactNumber } from '../lib/format';
import { LanguageSpectrum } from './LanguageSpectrum';
import { ActivityHeatmap } from './ActivityHeatmap';
import { ArrowOutIcon, PinIcon } from './icons';

interface Props {
  profile: Profile;
  spectrum: Spectrum;
  activity: Activity;
  totalStars: number;
  activeLanguage: string | null;
  isPinned: boolean;
  comparing: boolean;
  onSelectLanguage: (language: string | null) => void;
  onTogglePin: () => void;
  onCompare: (login: string) => void;
}

/**
 * The drawing's title block: who this sheet is about, and the four figures
 * that describe them. Stat tiles, not a chart — four headline numbers with no
 * comparison to make. Proportional figures here; `tabular-nums` is reserved
 * for the repo rows, where counts actually align vertically.
 */
function Spec({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="border-l border-line pl-3">
      <dt className="label">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-semibold text-ink" title={title}>
        {value}
      </dd>
    </div>
  );
}

export function ProfileCard({
  profile,
  spectrum,
  activity,
  totalStars,
  activeLanguage,
  isPinned,
  comparing,
  onSelectLanguage,
  onTogglePin,
  onCompare,
}: Props) {
  const { user, repos, truncated } = profile;
  const [vsDraft, setVsDraft] = useState('');
  const [vsOpen, setVsOpen] = useState(false);

  return (
    <section className="sheet bp-corners deck-rise p-5 sm:p-6" aria-labelledby="profile-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="label">Sheet 01 — Account overview</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={isPinned}
            onClick={onTogglePin}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[2px] border px-2 py-1 font-mono text-[11px] transition-colors ${
              isPinned
                ? 'border-accent bg-accent-soft text-ink'
                : 'border-line text-ink-2 hover:border-line-strong'
            }`}
          >
            <PinIcon className="size-3" />
            {isPinned ? 'Pinned' : 'Pin'}
          </button>

          {!comparing && (
            <button
              type="button"
              onClick={() => setVsOpen((open) => !open)}
              aria-expanded={vsOpen}
              className="cursor-pointer rounded-[2px] border border-line px-2 py-1 font-mono text-[11px] text-ink-2 transition-colors hover:border-line-strong"
            >
              Compare with…
            </button>
          )}
        </div>
      </div>

      {vsOpen && !comparing && (
        <form
          className="mb-4 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const handle = vsDraft.trim();
            if (!handle) return;
            onCompare(handle);
            setVsDraft('');
            setVsOpen(false);
          }}
        >
          <label htmlFor="compare-with" className="label">
            Second account
          </label>
          <input
            id="compare-with"
            value={vsDraft}
            onChange={(event) => setVsDraft(event.target.value)}
            placeholder="username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-8 min-w-0 flex-1 rounded-[2px] border border-line bg-inset px-2 font-mono text-[12px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none sm:max-w-56"
          />
          <button
            type="submit"
            disabled={vsDraft.trim().length === 0}
            className="h-8 cursor-pointer rounded-[2px] bg-accent px-3 font-display text-[12px] font-semibold uppercase tracking-wider text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Compare
          </button>
        </form>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <img
          src={user.avatar_url}
          alt=""
          width={88}
          height={88}
          className="size-20 shrink-0 rounded-[2px] border border-line object-cover sm:size-22"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id="profile-heading"
              className="truncate font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {user.name ?? user.login}
            </h2>
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded-[2px] font-mono text-sm text-ink-2 hover:text-accent hover:underline"
            >
              @{user.login}
              <ArrowOutIcon className="size-3.5" />
            </a>
          </div>

          {user.bio && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{user.bio}</p>}

          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-3">
            {user.company && <li>{user.company}</li>}
            {user.location && <li>{user.location}</li>}
            {user.blog && (
              <li>
                <a
                  href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent hover:underline"
                >
                  {user.blog.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            <li>Joined {absoluteDate(user.created_at)}</li>
          </ul>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <Spec label="Repos" value={exactNumber(user.public_repos)} />
        <Spec
          label="Stars"
          value={compactNumber(totalStars)}
          title={`${exactNumber(totalStars)} stars across the ${exactNumber(repos.length)} repos loaded`}
        />
        <Spec label="Followers" value={compactNumber(user.followers)} />
        <Spec label="Following" value={compactNumber(user.following)} />
      </dl>

      {truncated && (
        <p className="mt-4 border-t border-dashed border-line pt-3 font-mono text-[11px] text-ink-3">
          Showing the {exactNumber(repos.length)} most recently updated repositories — this account
          has more than we load in one go.
        </p>
      )}

      <LanguageSpectrum
        spectrum={spectrum}
        activeLanguage={activeLanguage}
        onSelectLanguage={onSelectLanguage}
      />

      <ActivityHeatmap activity={activity} />
    </section>
  );
}
