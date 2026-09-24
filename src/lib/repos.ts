import type { GitHubRepo, SortKey } from '../types';

export interface RepoQuery {
  search: string;
  language: string | null;
  topic: string | null;
  sort: SortKey;
  sourcesOnly: boolean;
}

/**
 * `label` names the sort in the palette, `short` fits a segmented control on
 * a phone, and `noun` finishes "sorted by …" under the controls.
 */
export const SORT_OPTIONS: Array<{ value: SortKey; label: string; short: string; noun: string }> = [
  { value: 'stars', label: 'Most stars', short: 'Stars', noun: 'stars' },
  { value: 'updated', label: 'Recently updated', short: 'Updated', noun: 'last update' },
  { value: 'name', label: 'Name (A–Z)', short: 'Name A–Z', noun: 'name' },
  { value: 'forks', label: 'Most forks', short: 'Forks', noun: 'forks' },
];

/**
 * Matches the search box against name, description, and topics. Every repo is
 * already in memory after the fetch, so filtering client-side is instant and
 * spends no rate-limit budget — the alternative (GitHub's search endpoint) is
 * both slower and capped at 10 requests/minute for anonymous callers.
 */
function matchesSearch(repo: GitHubRepo, needle: string): boolean {
  if (!needle) return true;
  const haystack = [repo.name, repo.description ?? '', ...(repo.topics ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function comparator(sort: SortKey): (a: GitHubRepo, b: GitHubRepo) => number {
  switch (sort) {
    case 'name':
      // `numeric` so "v2" sorts after "v10" the way a human expects.
      return (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true });
    case 'updated':
      return (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    case 'forks':
      return (a, b) => b.forks_count - a.forks_count || a.name.localeCompare(b.name, 'en');
    case 'stars':
    default:
      // Name as the tiebreaker keeps the order stable across renders when a
      // user has a long tail of zero-star repos.
      return (a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name, 'en');
  }
}

/** Pure: same repos + same query always produce the same list. */
export function selectRepos(repos: GitHubRepo[], query: RepoQuery): GitHubRepo[] {
  const needle = query.search.trim().toLowerCase();

  return repos
    .filter((repo) => {
      if (query.sourcesOnly && repo.fork) return false;
      if (query.language && repo.language !== query.language) return false;
      if (query.topic && !(repo.topics ?? []).includes(query.topic)) return false;
      return matchesSearch(repo, needle);
    })
    .sort(comparator(query.sort));
}

/** Languages present in the set, most-used first, for the filter dropdown. */
export function languageOptions(repos: GitHubRepo[]): Array<{ language: string; count: number }> {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language, 'en'));
}

/**
 * Topics across the set, most-used first. GitHub already returns these on the
 * repo payload, so surfacing them as filters costs no extra requests — they
 * were being fetched and thrown away.
 */
export function topicOptions(
  repos: GitHubRepo[],
  limit = 24,
): Array<{ topic: string; count: number }> {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    for (const topic of repo.topics ?? []) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'en'))
    .slice(0, limit);
}

export function totalStars(repos: GitHubRepo[]): number {
  return repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
}
