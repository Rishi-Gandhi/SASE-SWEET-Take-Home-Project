import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../hooks/useTheme';
import { DeckMark, MoonIcon, SearchIcon, SunIcon } from './icons';

interface Props {
  username: string;
  onSubmit: (username: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  busy: boolean;
}

export function TopBar({ username, onSubmit, theme, onToggleTheme, onOpenPalette, busy }: Props) {
  const [draft, setDraft] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  // The committed username can change without the input being touched — a
  // suggestion, a shared link, the browser Back button — so mirror it.
  useEffect(() => setDraft(username), [username]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typingElsewhere =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      // ⌘K opens the palette from anywhere; bare "/" jumps to this field, but
      // only when the viewer is not already typing into something.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenPalette();
        return;
      }
      if (event.key === '/' && !typingElsewhere && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenPalette]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 sm:px-6">
        <a href="./" className="flex shrink-0 items-center gap-2 text-ink" aria-label="Repo Deck home">
          <DeckMark className="size-6 text-accent" />
          <span className="hidden font-display text-[13px] font-bold uppercase tracking-[0.2em] sm:inline">
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
          className="order-3 flex w-full min-w-0 items-center gap-2 sm:order-none sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1"
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
              className="h-10 w-full rounded-[2px] border border-line bg-surface pl-9 pr-3 font-mono text-sm text-ink transition-colors placeholder:font-sans placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            className="h-10 shrink-0 cursor-pointer rounded-[2px] bg-accent px-4 font-display text-sm font-semibold uppercase tracking-wider text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Loading' : 'Draw'}
          </button>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Open command palette"
            className="hidden h-9 cursor-pointer items-center gap-2 rounded-[2px] border border-line px-2.5 text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:flex"
          >
            <span className="label">Commands</span>
            <kbd className="rounded-[2px] border border-line px-1 font-mono text-[10px]">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="flex size-9 cursor-pointer items-center justify-center rounded-[2px] border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
