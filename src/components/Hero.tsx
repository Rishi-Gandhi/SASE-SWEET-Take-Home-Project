import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ProfileState } from '../hooks/useProfile';
import { useOnScreen } from '../hooks/useOnScreen';
import { topRepos } from '../lib/highlights';
import { compactNumber } from '../lib/format';
import { OrbitStage } from './OrbitStage';
import type { OrbitPillData } from './OrbitPill';
import { SearchForm, SearchHint } from './SearchForm';
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
  onSeeResults: () => void;
}

export function Hero({
  username,
  profileState,
  pinned,
  recent,
  reducedMotion,
  inputRef,
  onOpen,
  onSeeResults,
}: Props) {
  const heroRef = useRef<HTMLElement>(null);
  // Arrives at 15% visible. Off screen, the loop stops and the CSS loops
  // (smoke, rings, float) pause too, rather than ticking unseen.
  const onScreen = useOnScreen(heroRef, 0.15);
  const pills = useMemo(() => pillsFor(profileState), [profileState]);

  // The cube shakes its head at a handle that cannot exist — one GitHub does
  // not know, or one its rules forbid — but not at a spent quota or a dropped
  // connection, which are not the viewer's mistake.
  const [shakeKey, setShakeKey] = useState(0);
  const shake = () => setShakeKey((n) => n + 1);
  useEffect(() => {
    if (
      profileState.status === 'error' &&
      (profileState.error.kind === 'not-found' || profileState.error.kind === 'invalid-username')
    ) {
      setShakeKey((n) => n + 1);
    }
  }, [profileState]);

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`hero ${onScreen ? '' : 'is-offscreen'}`}
      aria-labelledby="hero-title"
    >
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
        shakeKey={shakeKey}
        reducedMotion={reducedMotion}
        onScreen={onScreen}
        heroRef={heroRef}
      />

      <SearchForm
        username={username}
        inputRef={inputRef}
        onOpen={onOpen}
        onEmpty={shake}
        hint={
          <SearchHint
            state={profileState}
            pinned={pinned}
            recent={recent}
            onPick={onOpen}
            onSeeResults={onSeeResults}
          />
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
