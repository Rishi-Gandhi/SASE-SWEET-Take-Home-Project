import type { RefObject } from 'react';
import type { ProfileState } from '../hooks/useProfile';
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
      <h1 id="hero-title" className="sr-only">
        RepoBox
      </h1>

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
    </section>
  );
}
