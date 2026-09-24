import type { RefObject } from 'react';
import type { ProfileState } from '../hooks/useProfile';
import { OrbitStage } from './OrbitStage';
import { IdleHint, SearchForm } from './SearchForm';

interface Props {
  username: string;
  profileState: ProfileState;
  pinned: string[];
  recent: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: (username: string) => void;
}

export function Hero({ username, profileState, pinned, recent, inputRef, onOpen }: Props) {
  return (
    <section id="hero" className="hero" aria-labelledby="hero-title">
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

      <OrbitStage />

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
