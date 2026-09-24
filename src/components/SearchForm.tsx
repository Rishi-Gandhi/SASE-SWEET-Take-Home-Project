import { Fragment, useEffect, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ProfileState } from '../hooks/useProfile';
import type { GitHubError } from '../lib/github';
import { exactNumber, timeUntil } from '../lib/format';

interface Props {
  /** The committed username, from the URL. */
  username: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: (username: string) => void;
  /** Called when the form is submitted with nothing in it. */
  onEmpty?: () => void;
  /** What the line under the field says when there is no local problem. */
  hint: ReactNode;
}

/**
 * The one place a username is typed. Submitting hands the handle to the same
 * `setUsername` the old top-bar field used; fetching, validation against
 * GitHub's rules, and error handling all stay where they were.
 */
export function SearchForm({ username, inputRef, onOpen, onEmpty, hint }: Props) {
  const [draft, setDraft] = useState(username);
  const [problem, setProblem] = useState<string | null>(null);

  // The committed username can change without the field being touched — a
  // suggestion, a shared link, the browser Back button — so mirror it.
  useEffect(() => setDraft(username), [username]);

  return (
    <form
      role="search"
      className="search"
      onSubmit={(event) => {
        event.preventDefault();
        // The field shows an "@" prefix, so a pasted "@octocat" is the same handle.
        const login = draft.trim().replace(/^@/, '');
        if (!login) {
          setProblem('Type a GitHub username first.');
          onEmpty?.();
          return;
        }
        setProblem(null);
        onOpen(login);
        inputRef.current?.blur();
      }}
    >
      <label htmlFor="username" className="label">
        GitHub username
      </label>

      <div className="search-row">
        <span className="search-at" aria-hidden="true">
          @
        </span>
        <input
          id="username"
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setProblem(null);
          }}
          placeholder="e.g. octocat"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby="search-hint"
          className="search-input"
        />
        <button type="submit" className="btn-primary">
          Open box
        </button>
      </div>

      {/* One polite live region for the whole search lifecycle, so a screen
          reader hears validation, loading, and the outcome in one place. */}
      <p id="search-hint" className="hint" aria-live="polite">
        {problem ?? hint}
      </p>
    </form>
  );
}

const SUGGESTIONS = ['torvalds', 'sindresorhus', 'gaearon', 'simonw', 'anthropics'];

const sameHandle = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Before anything is opened: the viewer's pinned and recent handles, or a few
 * well-known accounts to try when there are none yet.
 */
export function IdleHint({
  pinned,
  recent,
  onPick,
}: {
  pinned: string[];
  recent: string[];
  onPick: (username: string) => void;
}) {
  // Anything already pinned would be a duplicate in the recents group.
  const recentOnly = recent.filter((name) => !pinned.some((p) => sameHandle(p, name)));

  const groups: Array<[string, string[]]> = [];
  if (pinned.length > 0) groups.push(['Pinned', pinned.slice(0, 4)]);
  if (recentOnly.length > 0) groups.push(['Recent', recentOnly.slice(0, 4)]);
  if (groups.length === 0) groups.push(['Try', SUGGESTIONS]);

  return (
    <>
      {groups.map(([title, handles], index) => (
        <span key={title} className="hint-group">
          {index > 0 && <span aria-hidden="true"> — </span>}
          {title}:{' '}
          {handles.map((handle, i) => (
            <Fragment key={handle}>
              {i > 0 && ' · '}
              <button type="button" onClick={() => onPick(handle)}>
                {handle}
              </button>
            </Fragment>
          ))}
        </span>
      ))}
    </>
  );
}

const clock = new Intl.DateTimeFormat('en', { timeStyle: 'short' });

/**
 * The same four failure modes the repositories section explains at length,
 * each in one line — a wrong handle, a spent quota and a dropped connection
 * need different actions, so none of them is "something went wrong".
 */
function errorHint(error: GitHubError, username: string): string {
  switch (error.kind) {
    case 'not-found':
      return `No GitHub user named @${username}.`;
    case 'rate-limit':
      return error.resetAt
        ? `GitHub's hourly limit for unauthenticated requests is used up. It resets ${timeUntil(error.resetAt)}, at ${clock.format(error.resetAt)}.`
        : "GitHub's hourly limit for unauthenticated requests is used up. It resets within the hour.";
    case 'network':
      return "Couldn't reach GitHub. Check your connection and try again.";
    default:
      return error.message;
  }
}

/** The line under the field, for each state of the search. */
export function SearchHint({
  state,
  pinned,
  recent,
  onPick,
  onSeeResults,
}: {
  state: ProfileState;
  pinned: string[];
  recent: string[];
  onPick: (username: string) => void;
  onSeeResults: () => void;
}) {
  switch (state.status) {
    case 'idle':
      return <IdleHint pinned={pinned} recent={recent} onPick={onPick} />;

    case 'loading':
      return <>Opening @{state.username}…</>;

    case 'error':
      return <>{errorHint(state.error, state.username)}</>;

    case 'ready': {
      const { user, repos, truncated } = state.profile;
      if (repos.length === 0) {
        return (
          <>
            Opened <b>@{user.login}</b>: no public repositories yet.
          </>
        );
      }
      const count = truncated
        ? `the ${exactNumber(repos.length)} most recently updated of ${exactNumber(user.public_repos)} public repositories`
        : `${exactNumber(repos.length)} public ${repos.length === 1 ? 'repository' : 'repositories'}`;
      return (
        <>
          Opened <b>@{user.login}</b>: {count}.{' '}
          <a
            href="#repositories"
            onClick={(event) => {
              event.preventDefault();
              onSeeResults();
            }}
          >
            See them below <span aria-hidden="true">↓</span>
          </a>
        </>
      );
    }
  }
}
