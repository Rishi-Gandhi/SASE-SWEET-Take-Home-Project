import type { GitHubRepo } from '../types';
import { compactNumber, exactNumber, relativeTime } from '../lib/format';
import { ArrowOutIcon, ForkIcon, StarIcon } from './icons';

interface Props {
  repo: GitHubRepo;
  /** Highest star count in the currently displayed list — the bar's full scale. */
  maxStars: number;
  languageColor: string;
  isLanguageActive: boolean;
  onSelectLanguage: (language: string | null) => void;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-ink-3">
      {children}
    </span>
  );
}

export function RepoCard({
  repo,
  maxStars,
  languageColor,
  isLanguageActive,
  onSelectLanguage,
}: Props) {
  /*
   * A linear scale against the largest repo on screen. Linear is the honest
   * choice — when one repo has 200k stars and the rest have 40, that gap is the
   * story, and a log scale would quietly flatten it. The 3px floor only exists
   * so a repo with stars never renders as literally nothing; the exact count
   * sits right above it either way.
   */
  const ratio = maxStars > 0 ? repo.stargazers_count / maxStars : 0;
  const barWidth = repo.stargazers_count === 0 ? '0px' : `max(3px, ${(ratio * 100).toFixed(2)}%)`;

  return (
    <article className="card group relative flex h-full min-w-0 flex-col p-4 transition-colors duration-200 hover:border-line-strong focus-within:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[15px] font-semibold leading-snug">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="break-words text-ink transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          >
            {repo.name}
          </a>
        </h3>

        <span
          className="flex shrink-0 items-center gap-1 font-mono text-xs text-ink-2 tabular-nums"
          title={`${exactNumber(repo.stargazers_count)} stars`}
        >
          <StarIcon className="size-3.5 text-ink-3" />
          {compactNumber(repo.stargazers_count)}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] min-w-0 text-[13px] leading-relaxed text-ink-2">
        {repo.description ?? <span className="text-ink-3 italic">No description</span>}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-3">
        {repo.language && (
          // z-10 lifts this above the title's stretched link so the chip stays
          // clickable while the rest of the card still opens the repo.
          <button
            type="button"
            aria-pressed={isLanguageActive}
            onClick={() => onSelectLanguage(isLanguageActive ? null : repo.language)}
            className={`relative z-10 -mx-1 flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-inset ${
              isLanguageActive ? 'bg-accent-soft' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: languageColor }}
            />
            <span className="text-ink-2">{repo.language}</span>
          </button>
        )}

        {repo.forks_count > 0 && (
          <span className="flex items-center gap-1 tabular-nums" title={`${exactNumber(repo.forks_count)} forks`}>
            <ForkIcon className="size-3" />
            {compactNumber(repo.forks_count)}
          </span>
        )}

        <span title={new Date(repo.pushed_at).toLocaleString()}>
          Updated {relativeTime(repo.pushed_at)}
        </span>

        {repo.fork && <Badge>Fork</Badge>}
        {repo.archived && <Badge>Archived</Badge>}

        <ArrowOutIcon
          aria-hidden="true"
          className="ml-auto size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>

      {/* Magnitude bar, pinned to the card's bottom edge. Under the title it
          read as a broken underline on low-star repos; as a footer rule with a
          visible track it reads as what it is — this repo's weight against the
          biggest one on screen. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden rounded-b-[13px] bg-line"
      >
        <div
          className="h-full rounded-r-full bg-accent transition-[width] duration-500 ease-out"
          style={{ width: barWidth }}
        />
      </div>
    </article>
  );
}
