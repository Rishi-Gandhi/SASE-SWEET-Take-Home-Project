import type { CSSProperties, RefObject } from 'react';
import type { GitHubRepo } from '../types';
import { repoOwner } from '../lib/compare';
import { RepoCard } from './RepoCard';

/** Cards fade up on a cascade, capped so a long list is not a wait. */
const STAGGER_MS = 35;
const STAGGER_CAP = 8;

interface Props {
  repos: GitHubRepo[];
  /** The grid the FLIP re-sort animation measures. */
  gridRef: RefObject<HTMLUListElement | null>;
  comparing: boolean;
  activeLanguage: string | null;
  activeTopic: string | null;
  onSelectLanguage: (language: string | null) => void;
  onSelectTopic: (topic: string | null) => void;
}

/**
 * The entrance lives on the card and the FLIP transform on the list item, so
 * the two transforms are on different elements and can never fight.
 */
export function RepoList({
  repos,
  gridRef,
  comparing,
  activeLanguage,
  activeTopic,
  onSelectLanguage,
  onSelectTopic,
}: Props) {
  return (
    <ul ref={gridRef} className="repo-grid" aria-labelledby="all-heading">
      {repos.map((repo, index) => (
        <li
          key={repo.id}
          data-flip-id={String(repo.id)}
          className="min-w-0"
          style={{ '--enter-delay': `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` } as CSSProperties}
        >
          <RepoCard
            repo={repo}
            owner={comparing ? repoOwner(repo) : null}
            isLanguageActive={activeLanguage !== null && activeLanguage === repo.language}
            activeTopic={activeTopic}
            onSelectLanguage={onSelectLanguage}
            onSelectTopic={onSelectTopic}
          />
        </li>
      ))}
    </ul>
  );
}
