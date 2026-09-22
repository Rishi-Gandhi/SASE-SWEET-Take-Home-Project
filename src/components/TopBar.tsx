import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import { DeckMark, MoonIcon, SearchIcon, SunIcon } from './icons';

interface Props {
  username: string;
  onSubmit: (username: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  busy: boolean;
}

export function TopBar({ username, onSubmit, theme, onToggleTheme, busy }: Props) {
  const [draft, setDraft] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  // The committed username can change without the input being touched — a
  // suggestion chip, a shared link, the browser Back button — so mirror it.
  useEffect(() => setDraft(username), [username]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      // ⌘K / Ctrl-K from anywhere; bare "/" only when not already typing.
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !typingElsewhere && !event.metaKey && !event.ctrlKey;

      if (isCommandK || isSlash) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 sm:px-6">
        <a
          href="./"
          className="flex shrink-0 items-center gap-2 text-ink"
          aria-label="Repo Deck home"
        >
          <DeckMark className="size-6 text-accent" />
          <span className="hidden text-[13px] font-semibold uppercase tracking-[0.18em] sm:inline">
            Repo Deck
          </span>
        </a>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(draft.trim());
            inputRef.current?.blur();
          }}
          className="order-3 flex w-full min-w-0 items-center gap-2 sm:order-none sm:ml-auto sm:w-auto sm:flex-1 sm:max-w-md"
        >
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <label htmlFor="username" className="sr-only">
              GitHub username
            </label>
            <input
              id="username"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="GitHub username…"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-14 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
            />
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3 sm:block"
            >
              ⌘K
            </kbd>
          </div>

          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="h-10 shrink-0 cursor-pointer rounded-xl bg-accent px-4 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Loading…' : 'Explore'}
          </button>
        </form>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          className="ml-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink sm:ml-0"
        >
          {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </button>
      </div>
    </header>
  );
}
