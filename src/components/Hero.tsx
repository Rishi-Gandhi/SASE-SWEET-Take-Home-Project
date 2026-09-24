import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { ProfileState } from '../hooks/useProfile';
import { topRepos } from '../lib/highlights';
import { compactNumber } from '../lib/format';
import { OrbitStage } from './OrbitStage';
import type { OrbitPillData } from './OrbitPill';
import { IdleHint, SearchForm } from './SearchForm';
import { ArrowOutIcon, BookIcon, CodeIcon, FilterIcon, SearchIcon, SortIcon, StarIcon } from './icons';

/** Before anything is opened, the orbit shows what RepoBox does. */
const FEATURE_PILLS: OrbitPillData[] = [
  { key: 'search', label: 'Search', icon: <SearchIcon /> },
  { key: 'sort', label: 'Sort', icon: <SortIcon /> },
  { key: 'filter', label: 'Filter', icon: <FilterIcon /> },
  { key: 'stars', label: 'Stars', icon: <StarIcon /> },
  { key: 'languages', label: 'Languages', icon: <CodeIcon /> },
  { key: 'links', label: 'Links', icon: <ArrowOutIcon /> },
];

const SKELETON_PILLS: null[] = Array.from({ length: 6 }, () => null);

/**
 * What the orbit says: the account's six most-starred repositories once one
 * is open, skeletons while it loads, and RepoBox's features otherwise. An
 * account with no public repositories gets an empty orbit, not features.
 */
function pillsFor(state: ProfileState): ReadonlyArray<OrbitPillData | null> {
  if (state.status === 'loading') return SKELETON_PILLS;
  if (state.status !== 'ready') return FEATURE_PILLS;
  return topRepos(state.profile.repos, 6).map((repo) => ({
    key: String(repo.id),
    label: repo.name,
    value: `★ ${compactNumber(repo.stargazers_count)}`,
    icon: <BookIcon />,
  }));
}

interface Props {
  username: string;
  profileState: ProfileState;
  pinned: string[];
  recent: string[];
  reducedMotion: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: (username: string) => void;
}

export function Hero({ username, profileState, pinned, recent, reducedMotion, inputRef, onOpen }: Props) {
  const heroRef = useRef<HTMLElement>(null);
  const pills = useMemo(() => pillsFor(profileState), [profileState]);

  return (
    <section ref={heroRef} id="hero" className="hero" aria-labelledby="hero-title">
      {/* Smoke and dust: soft background light, never in the way. */}
      <div className="hero-fx" aria-hidden="true">
        <span className="hero-smoke" />
        <span className="hero-dust" />
      </div>
      <div className="gridlines" aria-hidden="true" />

      <div className="hero-top">
        <h1 id="hero-title" className="label c1">
          RepoBox<em>Every public repo, one box</em>
        </h1>
        <p className="label c2">
          RepoBox opens any GitHub profile.{' '}
          <em>Search, sort, and filter every public repository in one place.</em>
        </p>
      </div>

      <OrbitStage
        pills={pills}
        loading={profileState.status === 'loading'}
        reducedMotion={reducedMotion}
        heroRef={heroRef}
      />

      <SearchForm
        username={username}
        inputRef={inputRef}
        onOpen={onOpen}
        hint={
          profileState.status === 'idle' ? (
            <IdleHint pinned={pinned} recent={recent} onPick={onOpen} />
          ) : null
        }
      />

      <span className="label hero-corner is-left" aria-hidden="true">
        Search
      </span>
      <span className="label hero-corner is-right" aria-hidden="true">
        Sort · Filter
      </span>
    </section>
  );
}
