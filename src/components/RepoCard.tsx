import type { GitHubRepo } from '../types';
import { compactNumber, exactNumber, relativeTime } from '../lib/format';
import { ArrowOutIcon, ForkIcon, StarIcon } from './icons';

interface Props {
  repo: GitHubRepo;
  /** Drawing number, so each card reads as a plate in one document. */
  figure: number;
  /** Highest star count in the currently displayed list — the bar's full scale. */
  maxStars: number;
  languageColor: string;
  isLanguageActive: boolean;
  activeTopic: string | null;
  /** The lead card: wider cell, more detail, the drawing the sheet is about. */
  principal?: boolean;
  onSelectLanguage: (language: string | null) => void;
  onSelectTopic: (topic: string | null) => void;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="label rounded-[2px] border border-line px-1.5 py-px">{children}</span>
  );
}

export function RepoCard({
  repo,
  figure,
  maxStars,
  languageColor,
  isLanguageActive,
  activeTopic,
  principal = false,
  onSelectLanguage,
  onSelectTopic,
}: Props) {
  /*
   * Linear against the largest repo on screen. Linear is the honest choice —
   * when one repo has 200k stars and the rest have 40, that gap is the story,
   * and a log scale would quietly flatten it. The 2% floor only exists so a
   * repo with stars never measures as nothing.
   */
  const ratio = maxStars > 0 ? repo.stargazers_count / maxStars : 0;
  const measured = repo.stargazers_count === 0 ? 0 : Math.max(2, ratio * 100);

  const topics = (repo.topics ?? []).slice(0, principal ? 6 : 3);
  const hiddenTopics = (repo.topics ?? []).length - topics.length;

  return (
    <article
      data-flip-id={String(repo.id)}
      className="sheet bp-corners group relative flex h-full min-w-0 flex-col p-4 transition-colors duration-200 hover:border-line-strong focus-within:border-line-strong"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Fig. {String(figure).padStart(2, '0')}</span>
        <span
          className="flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums text-ink-2"
          title={`${exactNumber(repo.stargazers_count)} stars`}
        >
          <StarIcon className="size-3 text-ink-3" />
          {compactNumber(repo.stargazers_count)}
        </span>
      </div>

      <h3
        className={`mt-1.5 min-w-0 font-display font-semibold leading-tight tracking-tight ${
          principal ? 'text-2xl' : 'text-[17px]'
        }`}
      >
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-ink transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
        >
          {repo.name}
        </a>
      </h3>

      {/* A dimension line: the extent is the biggest repo on screen, the
          measured span is this one. */}
      <div className="mt-2.5 h-px w-full bg-line" aria-hidden="true">
        <div
          className="bp-tick h-px bg-accent transition-[width] duration-500 ease-out"
          style={{ width: `${measured}%` }}
        />
      </div>

      <p
        className={`mt-3 min-w-0 text-[13px] leading-relaxed text-ink-2 ${
          principal ? 'line-clamp-3 min-h-[3.8rem] text-[14px]' : 'line-clamp-2 min-h-[2.5rem]'
        }`}
      >
        {repo.description ?? <span className="italic text-ink-3">No description</span>}
      </p>

      {topics.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {topics.map((topic) => {
            const isActive = activeTopic === topic;
            return (
              <li key={topic}>
                {/* z-10 lifts these above the title's stretched link so a topic
                    stays clickable while the rest of the card opens the repo. */}
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectTopic(isActive ? null : topic)}
                  className={`relative z-10 cursor-pointer rounded-[2px] border px-1.5 py-px font-mono text-[10px] transition-colors ${
                    isActive
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line text-ink-3 hover:border-line-strong hover:text-ink-2'
                  }`}
                >
                  {topic}
                </button>
              </li>
            );
          })}
          {hiddenTopics > 0 && (
            <li className="font-mono text-[10px] leading-[1.35rem] text-ink-3">+{hiddenTopics}</li>
          )}
        </ul>
      )}

      {/* The principal gets the lead cell, so it has to earn it: licence,
          issues and homepage are already in the payload and otherwise thrown
          away. */}
      {principal && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-dashed border-line pt-3">
          <div>
            <dt className="label">Licence</dt>
            <dd className="mt-0.5 font-mono text-[11px] text-ink-2">
              {repo.license?.spdx_id ?? 'None'}
            </dd>
          </div>
          <div>
            <dt className="label">Open issues</dt>
            <dd className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-2">
              {exactNumber(repo.open_issues_count)}
            </dd>
          </div>
          <div>
            <dt className="label">Watchers</dt>
            <dd className="mt-0.5 font-mono text-[11px] tabular-nums text-ink-2">
              {compactNumber(repo.watchers_count)}
            </dd>
          </div>
          {repo.homepage && (
            <div className="min-w-0">
              <dt className="label">Homepage</dt>
              <dd className="mt-0.5 min-w-0 truncate font-mono text-[11px]">
                <a
                  href={repo.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 text-ink-2 hover:text-accent hover:underline"
                >
                  {repo.homepage.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 font-mono text-[10.5px] text-ink-3">
        {repo.language && (
          <button
            type="button"
            aria-pressed={isLanguageActive}
            onClick={() => onSelectLanguage(isLanguageActive ? null : repo.language)}
            className={`relative z-10 -mx-1 flex cursor-pointer items-center gap-1.5 rounded-[2px] px-1 py-0.5 transition-colors hover:bg-inset ${
              isLanguageActive ? 'bg-accent-soft' : ''
            }`}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-[1px]"
              style={{ background: languageColor }}
            />
            <span className="text-ink-2">{repo.language}</span>
          </button>
        )}

        {repo.forks_count > 0 && (
          <span
            className="flex items-center gap-1 tabular-nums"
            title={`${exactNumber(repo.forks_count)} forks`}
          >
            <ForkIcon className="size-3" />
            {compactNumber(repo.forks_count)}
          </span>
        )}

        <span title={new Date(repo.pushed_at).toLocaleString()}>
          Rev {relativeTime(repo.pushed_at).replace(' ago', '')}
        </span>

        {repo.fork && <Badge>Fork</Badge>}
        {repo.archived && <Badge>Archived</Badge>}

        <ArrowOutIcon
          aria-hidden="true"
          className="ml-auto size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>
    </article>
  );
}
