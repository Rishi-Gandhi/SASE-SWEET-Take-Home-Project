import { useState } from 'react';
import type { Profile } from '../types';
import type { Spectrum } from '../lib/spectrum';
import type { Activity } from '../lib/activity';
import { absoluteDate, compactNumber, exactNumber } from '../lib/format';
import { LanguageSpectrum } from './LanguageSpectrum';
import { ActivityHeatmap } from './ActivityHeatmap';
import { PinIcon } from './icons';

interface Props {
  profile: Profile;
  totalStars: number;
  spectrum: Spectrum;
  activity: Activity;
  activeLanguage: string | null;
  isPinned: boolean;
  comparing: boolean;
  onSelectLanguage: (language: string | null) => void;
  onTogglePin: () => void;
  onCompare: (login: string) => void;
  /** Receives the header row, so the top bar knows when it has scrolled away. */
  headerRef: (node: HTMLElement | null) => void;
}

/**
 * Who this account is, and the shape of its work: the language mix and the
 * last-push strip. Both are drawn from the unfiltered repositories, so they
 * describe the account, not the current filter.
 */
export function ProfileHeader({
  profile,
  totalStars,
  spectrum,
  activity,
  activeLanguage,
  isPinned,
  comparing,
  onSelectLanguage,
  onTogglePin,
  onCompare,
  headerRef,
}: Props) {
  const { user, repos, truncated } = profile;
  const [vsDraft, setVsDraft] = useState('');
  const [vsOpen, setVsOpen] = useState(false);

  return (
    <section className="profile" aria-labelledby="profile-heading">
      <header ref={headerRef} className="profile-head">
        <img src={user.avatar_url} alt="" width={64} height={64} className="profile-avatar" />

        <div className="min-w-0 flex-1">
          <h2 id="profile-heading" className="profile-name">
            @{user.login}
          </h2>
          <p className="profile-meta">
            {user.name && `${user.name} · `}
            {exactNumber(user.public_repos)} public {user.public_repos === 1 ? 'repository' : 'repositories'} ·{' '}
            <span title={`Across the ${exactNumber(repos.length)} repositories loaded`}>
              {exactNumber(totalStars)} {totalStars === 1 ? 'star' : 'stars'}
            </span>
          </p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}

          <ul className="profile-facts label">
            {user.company && <li>{user.company}</li>}
            {user.location && <li>{user.location}</li>}
            {user.blog && (
              <li>
                <a
                  href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-faint underline-offset-4 hover:text-fg"
                >
                  {user.blog.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            <li>{compactNumber(user.followers)} followers</li>
            <li>Joined {absoluteDate(user.created_at)}</li>
          </ul>
        </div>

        <div className="profile-actions">
          <button type="button" className="chip" aria-pressed={isPinned} onClick={onTogglePin}>
            <PinIcon className="size-3.5" />
            {isPinned ? 'Pinned' : 'Pin'}
          </button>

          {!comparing && (
            <button
              type="button"
              className="chip"
              aria-expanded={vsOpen}
              onClick={() => setVsOpen((open) => !open)}
            >
              Compare with…
            </button>
          )}

          <a className="chip" href={user.html_url} target="_blank" rel="noopener noreferrer">
            Profile on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      {vsOpen && !comparing && (
        <form
          className="mt-5 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const handle = vsDraft.trim().replace(/^@/, '');
            if (!handle) return;
            onCompare(handle);
            setVsDraft('');
            setVsOpen(false);
          }}
        >
          <label htmlFor="compare-with" className="label text-muted">
            Second account
          </label>
          <div className="field max-w-72">
            <input
              id="compare-with"
              value={vsDraft}
              onChange={(event) => setVsDraft(event.target.value)}
              placeholder="username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={vsDraft.trim().length === 0}>
            Compare
          </button>
        </form>
      )}

      {truncated && (
        <p className="label mt-5 text-muted">
          Showing the {exactNumber(repos.length)} most recently updated repositories — this account has
          more than RepoBox loads in one go.
        </p>
      )}

      <div className="profile-charts">
        <LanguageSpectrum spectrum={spectrum} activeLanguage={activeLanguage} onSelectLanguage={onSelectLanguage} />
        <ActivityHeatmap activity={activity} />
      </div>
    </section>
  );
}
