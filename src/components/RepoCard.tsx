import type { GitHubRepo } from '../types';
import { exactNumber, relativeTime } from '../lib/format';
import { languageColor } from '../lib/languages';
import { StarIcon } from './icons';

interface Props {
  repo: GitHubRepo;
  /** Set only while comparing, when one grid holds two accounts' repos. */
  owner?: string | null;
  isLanguageActive: boolean;
  activeTopic: string | null;
  onSelectLanguage: (language: string | null) => void;
  onSelectTopic: (topic: string | null) => void;
}

/**
 * One repository. The GitHub link's accessible name is its visible label plus
 * the repo ("View on GitHub: kernel"): a screen reader's links list is not
 * thirty identical entries, and a voice-control user can still say the words
 * they see. The language and topics are buttons that filter the list.
 */
export function RepoCard({
  repo,
  owner = null,
  isLanguageActive,
  activeTopic,
  onSelectLanguage,
  onSelectTopic,
}: Props) {
  const topics = (repo.topics ?? []).slice(0, 3);
  const hiddenTopics = (repo.topics ?? []).length - topics.length;

  const facts = [
    `Updated ${relativeTime(repo.pushed_at)}`,
    repo.forks_count > 0 && `${exactNumber(repo.forks_count)} ${repo.forks_count === 1 ? 'fork' : 'forks'}`,
    repo.fork && 'Fork',
    repo.archived && 'Archived',
  ].filter(Boolean);

  return (
    <article className="repo-card enter">
      <div className="repo-card-top">
        <h4 className="repo-card-name">{repo.name}</h4>
        <span className="repo-card-stars">
          <StarIcon />
          {exactNumber(repo.stargazers_count)}
          <span className="sr-only"> stars</span>
        </span>
      </div>

      {owner && <p className="label text-muted">@{owner}</p>}

      <p className={`repo-card-desc ${repo.description ? '' : 'is-empty'}`}>
        {repo.description ?? 'No description provided.'}
      </p>

      {topics.length > 0 && (
        <ul className="repo-card-topics">
          {topics.map((topic) => {
            const isActive = activeTopic === topic;
            return (
              <li key={topic}>
                <button
                  type="button"
                  className="topic-chip"
                  aria-pressed={isActive}
                  onClick={() => onSelectTopic(isActive ? null : topic)}
                >
                  {topic}
                </button>
              </li>
            );
          })}
          {hiddenTopics > 0 && <li className="label text-muted">+{hiddenTopics}</li>}
        </ul>
      )}

      <p className="label repo-card-facts" title={new Date(repo.pushed_at).toLocaleString()}>
        {facts.join(' · ')}
      </p>

      <div className="repo-card-meta">
        {repo.language ? (
          <button
            type="button"
            className="lang-btn"
            aria-pressed={isLanguageActive}
            onClick={() => onSelectLanguage(isLanguageActive ? null : repo.language)}
          >
            <span className="lang-dot" style={{ background: languageColor(repo.language) }} aria-hidden="true" />
            {repo.language}
          </button>
        ) : (
          <span />
        )}
        <a className="gh-link" href={repo.html_url} target="_blank" rel="noopener noreferrer">
          View on GitHub<span className="sr-only">: {repo.name}</span> <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
