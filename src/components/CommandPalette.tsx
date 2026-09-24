import { useEffect, useMemo, useRef, useState } from 'react';
import type { GitHubRepo, SortKey } from '../types';
import { SORT_OPTIONS } from '../lib/repos';
import { isValidUsername } from '../lib/github';
import { compactNumber } from '../lib/format';
import { SearchIcon } from './icons';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  repos: GitHubRepo[];
  recent: string[];
  pinned: string[];
  currentLogin: string | null;
  isPinned: (login: string) => boolean;
  comparing: boolean;
  sort: SortKey;
  sourcesOnly: boolean;
  hasFilters: boolean;
  onPickUser: (login: string) => void;
  onCompare: (login: string) => void;
  onStopCompare: () => void;
  onTogglePin: (login: string) => void;
  onSort: (sort: SortKey) => void;
  onToggleForks: () => void;
  onClearFilters: () => void;
}

/**
 * ⌘K used to just focus the search box. This is the real thing: one surface
 * for jumping to a user, opening a repo, and running the commands that are
 * otherwise buried in the filter bar.
 *
 * It is a listbox driven by the input rather than a set of focusable rows, so
 * the caret never leaves the field — `aria-activedescendant` is what tells a
 * screen reader which option is current.
 */
export function CommandPalette(props: Props) {
  const { open, onClose, repos, recent, pinned } = props;
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const commands = useMemo<Command[]>(() => {
    const needle = query.trim().toLowerCase();
    const out: Command[] = [];

    const handle = query.trim();
    if (handle && isValidUsername(handle)) {
      out.push({
        id: `explore-${handle}`,
        group: 'Search',
        label: `Explore ${handle}`,
        hint: 'GitHub user',
        run: () => props.onPickUser(handle),
      });
      if (!props.comparing && handle.toLowerCase() !== props.currentLogin?.toLowerCase()) {
        out.push({
          id: `compare-${handle}`,
          group: 'Search',
          label: `Compare with ${handle}`,
          hint: 'Side by side',
          run: () => props.onCompare(handle),
        });
      }
    }

    for (const login of pinned) {
      if (needle && !login.toLowerCase().includes(needle)) continue;
      out.push({
        id: `pinned-${login}`,
        group: 'Pinned',
        label: login,
        hint: 'Pinned',
        run: () => props.onPickUser(login),
      });
    }

    for (const login of recent) {
      if (pinned.some((p) => p.toLowerCase() === login.toLowerCase())) continue;
      if (needle && !login.toLowerCase().includes(needle)) continue;
      if (handle && login.toLowerCase() === handle.toLowerCase()) continue;
      out.push({
        id: `recent-${login}`,
        group: 'Recent',
        label: login,
        hint: 'Recently explored',
        run: () => props.onPickUser(login),
      });
    }

    const matchingRepos = repos
      .filter((repo) => !needle || repo.name.toLowerCase().includes(needle))
      .slice(0, 6);
    for (const repo of matchingRepos) {
      out.push({
        id: `repo-${repo.id}`,
        group: 'Repositories',
        label: repo.name,
        hint: `★ ${compactNumber(repo.stargazers_count)}${repo.language ? ` · ${repo.language}` : ''}`,
        run: () => window.open(repo.html_url, '_blank', 'noopener,noreferrer'),
      });
    }

    const actions: Command[] = [
      ...(props.currentLogin
        ? [
            {
              id: 'toggle-pin',
              group: 'Commands',
              label: props.isPinned(props.currentLogin)
                ? `Unpin ${props.currentLogin}`
                : `Pin ${props.currentLogin}`,
              hint: 'Pins',
              run: () => props.onTogglePin(props.currentLogin as string),
            },
          ]
        : []),
      ...(props.comparing
        ? [
            {
              id: 'stop-compare',
              group: 'Commands',
              label: 'Stop comparing',
              hint: 'Compare',
              run: props.onStopCompare,
            },
          ]
        : []),
      ...SORT_OPTIONS.filter((option) => option.value !== props.sort).map((option) => ({
        id: `sort-${option.value}`,
        group: 'Commands',
        label: `Sort by ${option.label.toLowerCase()}`,
        hint: 'Sort',
        run: () => props.onSort(option.value),
      })),
      {
        id: 'toggle-forks',
        group: 'Commands',
        label: props.sourcesOnly ? 'Show forks' : 'Hide forks',
        hint: 'Filter',
        run: props.onToggleForks,
      },
    ];

    if (props.hasFilters) {
      actions.push({
        id: 'clear-filters',
        group: 'Commands',
        label: 'Clear all filters',
        hint: 'Filter',
        run: props.onClearFilters,
      });
    }

    for (const action of actions) {
      if (!needle || action.label.toLowerCase().includes(needle)) out.push(action);
    }

    return out;
  }, [query, repos, recent, pinned, props]);

  // Reset to a clean slate each time it opens, and remember where focus came
  // from so closing puts it back.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    setQuery('');
    setActive(0);
    inputRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const run = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (commands.length === 0 ? 0 : (i + 1) % commands.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (commands.length === 0 ? 0 : (i - 1 + commands.length) % commands.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(commands[active]);
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-page/70 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="sheet deck-rise w-full max-w-xl overflow-hidden shadow-2xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
          <SearchIcon className="size-4 shrink-0 text-ink-3" />
          <label htmlFor="cmd-input" className="sr-only">
            Search users, repositories, and commands
          </label>
          <input
            id="cmd-input"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users, repos, commands…"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-list"
            aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
            className="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:font-sans placeholder:text-ink-3"
          />
          <kbd className="label rounded-[2px] border border-line px-1.5 py-0.5">esc</kbd>
        </div>

        <ul id="cmd-list" role="listbox" ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {commands.length === 0 && (
            <li className="px-3.5 py-6 text-center text-[13px] text-ink-3">
              Nothing matches “{query}”.
            </li>
          )}

          {commands.map((command, index) => {
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;

            return (
              <li key={command.id}>
                {showGroup && <p className="label px-3.5 pb-1 pt-2.5">{command.group}</p>}
                <div
                  id={`cmd-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => run(command)}
                  className={`mx-1.5 flex cursor-pointer items-center justify-between gap-3 rounded-[2px] px-2 py-1.5 text-[13px] ${
                    index === active ? 'bg-accent-soft text-ink' : 'text-ink-2'
                  }`}
                >
                  <span className="truncate font-mono">{command.label}</span>
                  {command.hint && (
                    <span className="shrink-0 font-mono text-[10px] text-ink-3">{command.hint}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
