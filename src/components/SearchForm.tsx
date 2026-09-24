import { Fragment, useEffect, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

interface Props {
  /** The committed username, from the URL. */
  username: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: (username: string) => void;
  /** What the line under the field says when there is no local problem. */
  hint: ReactNode;
}

/**
 * The one place a username is typed. Submitting hands the handle to the same
 * `setUsername` the old top-bar field used; fetching, validation against
 * GitHub's rules, and error handling all stay where they were.
 */
export function SearchForm({ username, inputRef, onOpen, hint }: Props) {
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
          className="search-input"
        />
        <button type="submit" className="btn-primary">
          Open box
        </button>
      </div>

      {/* One polite live region for the whole search lifecycle, so a screen
          reader hears validation, loading, and the outcome in one place. */}
      <p className="hint" aria-live="polite">
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
