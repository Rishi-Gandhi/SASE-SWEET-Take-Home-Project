import { useState } from 'react';
import type { SortKey } from '../types';
import { SORT_OPTIONS } from '../lib/repos';
import { exactNumber } from '../lib/format';
import { languageColor } from '../lib/languages';
import { SearchIcon } from './icons';

/** Enough chips for most accounts; a polyglot's long tail folds behind "+N more". */
const LANGUAGE_CHIP_LIMIT = 12;

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  sourcesOnly: boolean;
  onSourcesOnlyChange: (value: boolean) => void;
  topic: string | null;
  onTopicChange: (value: string | null) => void;
  language: string | null;
  languages: Array<{ language: string; count: number }>;
  onLanguageChange: (value: string | null) => void;
  shown: number;
  total: number;
}

/**
 * Every control here writes the same URL-backed state the old filter bar did;
 * only the presentation changed. The sort is a segmented control rather than
 * a dropdown because four options fit on one line and every one of them is
 * then a single tap — each is a real button with aria-pressed.
 */
export function RepoControls({
  search,
  onSearchChange,
  sort,
  onSortChange,
  sourcesOnly,
  onSourcesOnlyChange,
  topic,
  onTopicChange,
  language,
  languages,
  onLanguageChange,
  shown,
  total,
}: Props) {
  const sortNoun = SORT_OPTIONS.find((option) => option.value === sort)?.noun ?? 'stars';

  return (
    <div>
      <div className="controls">
        <div className="field">
          <SearchIcon />
          <label htmlFor="repo-filter" className="sr-only">
            Filter repositories by name, description, or topic
          </label>
          <input
            id="repo-filter"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter by name, description, or topic"
            autoComplete="off"
          />
        </div>

        <div className="seg" role="group" aria-label="Sort repositories">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={sort === option.value}
              onClick={() => onSortChange(option.value)}
            >
              {option.short}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="chip"
          aria-pressed={sourcesOnly}
          onClick={() => onSourcesOnlyChange(!sourcesOnly)}
        >
          Hide forks
        </button>

        {/* Topics are picked from the cards; this is how one is put down. */}
        {topic && (
          <button
            type="button"
            className="chip"
            aria-label={`Remove topic filter: ${topic}`}
            onClick={() => onTopicChange(null)}
          >
            Topic: {topic}
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>

      <LanguageChips language={language} languages={languages} onLanguageChange={onLanguageChange} />

      {/* Announced politely, so a screen-reader user hears the list change
          without focus leaving the control they just used. */}
      <p className="count" aria-live="polite">
        Showing {exactNumber(shown)} of {exactNumber(total)} {total === 1 ? 'repository' : 'repositories'} ·
        sorted by {sortNoun}
      </p>
    </div>
  );
}

function LanguageChips({
  language,
  languages,
  onLanguageChange,
}: Pick<Props, 'language' | 'languages' | 'onLanguageChange'>) {
  const [expanded, setExpanded] = useState(false);
  if (languages.length === 0) return null;

  const folded = expanded ? languages : languages.slice(0, LANGUAGE_CHIP_LIMIT);
  // The chosen language stays visible even when it lives in the folded tail.
  const chosen = languages.find((option) => option.language === language);
  const visible = chosen && !folded.includes(chosen) ? [...folded, chosen] : folded;
  const hidden = languages.length - visible.length;

  return (
    <div className="langs" role="group" aria-label="Filter by language">
      <button
        type="button"
        className="chip"
        aria-pressed={language === null}
        onClick={() => onLanguageChange(null)}
      >
        All languages
      </button>

      {visible.map(({ language: name, count }) => (
        <button
          key={name}
          type="button"
          className="chip"
          aria-pressed={language === name}
          title={`${exactNumber(count)} ${count === 1 ? 'repository' : 'repositories'}`}
          onClick={() => onLanguageChange(language === name ? null : name)}
        >
          <span className="lang-dot" style={{ background: languageColor(name) }} aria-hidden="true" />
          {name}
        </button>
      ))}

      {hidden > 0 && (
        <button type="button" className="chip chip-quiet" aria-expanded={false} onClick={() => setExpanded(true)}>
          +{hidden} more
        </button>
      )}
      {expanded && languages.length > LANGUAGE_CHIP_LIMIT && (
        <button type="button" className="chip chip-quiet" aria-expanded onClick={() => setExpanded(false)}>
          Fewer
        </button>
      )}
    </div>
  );
}
