import type { GitHubRepo, Profile } from '../types';

export interface CompareMetric {
  label: string;
  a: number;
  b: number;
  /** The larger of the two, which is this row's own scale. */
  max: number;
}

export interface Comparison {
  metrics: CompareMetric[];
  sharedLanguages: string[];
  sharedTopics: string[];
}

function languageSet(repos: GitHubRepo[]): Set<string> {
  const set = new Set<string>();
  for (const repo of repos) if (repo.language) set.add(repo.language);
  return set;
}

function topicSet(repos: GitHubRepo[]): Set<string> {
  const set = new Set<string>();
  for (const repo of repos) for (const topic of repo.topics ?? []) set.add(topic);
  return set;
}

function intersect(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((value) => b.has(value)).sort((x, y) => x.localeCompare(y, 'en'));
}

/**
 * Each metric carries its own maximum rather than sharing one scale.
 *
 * That is deliberate: repos and stars differ by three orders of magnitude, and
 * putting them on one axis would invent a relationship that is not in the data.
 * Per-row scales are small multiples — every row is its own chart — and the
 * exact figures are always printed beside the marks so the scale is never
 * ambiguous.
 */
export function compareProfiles(
  a: Profile,
  b: Profile,
  starsA: number,
  starsB: number,
): Comparison {
  const metrics: CompareMetric[] = [
    { label: 'Repos', a: a.user.public_repos, b: b.user.public_repos, max: 0 },
    { label: 'Stars', a: starsA, b: starsB, max: 0 },
    { label: 'Followers', a: a.user.followers, b: b.user.followers, max: 0 },
    { label: 'Following', a: a.user.following, b: b.user.following, max: 0 },
  ].map((metric) => ({ ...metric, max: Math.max(metric.a, metric.b, 1) }));

  return {
    metrics,
    sharedLanguages: intersect(languageSet(a.repos), languageSet(b.repos)),
    sharedTopics: intersect(topicSet(a.repos), topicSet(b.repos)).slice(0, 12),
  };
}

/**
 * Merges both accounts' repositories into one list. GitHub ids are unique
 * across the whole site, so no key collision is possible and the existing
 * filter/sort pipeline works on the merged set unchanged.
 */
export function mergeRepos(a: GitHubRepo[], b: GitHubRepo[]): GitHubRepo[] {
  return [...a, ...b];
}

/** "octocat/hello-world" -> "octocat". Avoids threading an owner field through. */
export function repoOwner(repo: GitHubRepo): string {
  return repo.full_name.split('/')[0] ?? '';
}
