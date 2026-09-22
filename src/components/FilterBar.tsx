import type { SortKey } from '../types';
import { SORT_OPTIONS } from '../lib/repos';
import { exactNumber } from '../lib/format';
import { SearchIcon } from './icons';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  language: string | null;
  languages: Array<{ language: string; count: number }>;
  onLanguageChange: (value: string | null) => void;
  topic: string | null;
  topics: Array<{ topic: string; count: number }>;
  onTopicChange: (value: string | null) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  sourcesOnly: boolean;
  onSourcesOnlyChange: (value: boolean) => void;
  shown: number;
  total: number;
}

/*
 * Native <select> on purpose. It is keyboard- and screen-reader-correct with
 * no code from me, and on a phone it opens the platform picker — which beats
 * any custom dropdown I could write in the time available. The arrow is drawn
 * with a background image so the control still looks like the rest of the UI.
 */
const selectClass =
  "h-9 cursor-pointer appearance-none rounded-[2px] border border-line bg-surface bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' fill='none' stroke='%236d9ab9' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[position:right_0.6rem_center] bg-no-repeat py-0 pl-2.5 pr-7 font-mono text-[12px] text-ink-2 transition-colors hover:border-line-strong";

export function FilterBar({
  search,
  onSearchChange,
  language,
  languages,
  onLanguageChange,
  topic,
  topics,
  onTopicChange,
  sort,
  onSortChange,
  sourcesOnly,
  onSourcesOnlyChange,
  shown,
  total,
}: Props) {
  return (
    <div className="sheet sticky top-2 z-20 mb-4 p-3 backdrop-blur-sm sm:top-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <label htmlFor="repo-filter" className="sr-only">
            Filter repositories by name, description, or topic
          </label>
          <input
            id="repo-filter"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter these repos…"
            autoComplete="off"
            className="h-9 w-full rounded-[2px] border border-line bg-inset pl-9 pr-3 font-mono text-[12px] text-ink transition-colors placeholder:font-sans placeholder:text-ink-3 hover:border-line-strong focus:border-accent focus:outline-none"
          />
        </div>

        <label htmlFor="repo-language" className="sr-only">
          Filter by language
        </label>
        <select
          id="repo-language"
          value={language ?? ''}
          onChange={(event) => onLanguageChange(event.target.value || null)}
          className={selectClass}
        >
          <option value="">All languages</option>
          {languages.map(({ language: name, count }) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </select>

        {topics.length > 0 && (
          <>
            <label htmlFor="repo-topic" className="sr-only">
              Filter by topic
            </label>
            <select
              id="repo-topic"
              value={topic ?? ''}
              onChange={(event) => onTopicChange(event.target.value || null)}
              className={selectClass}
            >
              <option value="">All topics</option>
              {topics.map(({ topic: name, count }) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="repo-sort" className="sr-only">
          Sort repositories
        </label>
        <select
          id="repo-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className={selectClass}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-pressed={sourcesOnly}
          onClick={() => onSourcesOnlyChange(!sourcesOnly)}
          className={`h-9 cursor-pointer rounded-[2px] border px-2.5 font-mono text-[12px] transition-colors ${
            sourcesOnly
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line text-ink-2 hover:border-line-strong'
          }`}
        >
          Hide forks
        </button>
      </div>

      {/* Announced politely so a screen-reader user hears the list resize
          without focus leaving the control they just changed. */}
      <p aria-live="polite" className="mt-2 font-mono text-[10.5px] text-ink-3">
        {shown === total
          ? `${exactNumber(total)} ${total === 1 ? 'repository' : 'repositories'}`
          : `${exactNumber(shown)} of ${exactNumber(total)} repositories`}
      </p>
    </div>
  );
}
