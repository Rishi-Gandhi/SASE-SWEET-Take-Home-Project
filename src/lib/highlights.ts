import type { GitHubRepo } from '../types';
import { clamp } from './motion';
import { selectRepos } from './repos';

/**
 * An account's most-starred repositories — the orbit pills and the carousel.
 *
 * Deliberately routed through `selectRepos` with an empty query rather than a
 * second comparator, so "top" can never disagree with the list's own "Most
 * stars" order, tie-breaks included. It always takes the unfiltered set: the
 * highlights are a fixed portrait of the account, and filtering the list
 * below them should never reshuffle them.
 */
export function topRepos(repos: GitHubRepo[], count: number): GitHubRepo[] {
  return selectRepos(repos, {
    search: '',
    language: null,
    topic: null,
    sort: 'stars',
    sourcesOnly: false,
  }).slice(0, count);
}

/**
 * How many cubes tall a repository's tower stands, 1–4, against the account's
 * most-starred repository. Log-scaled on purpose: star counts are heavily
 * skewed, and on a linear scale everything but the leader would be a single
 * cube. The tower is a glance; the exact count is printed beside it.
 */
export function towerHeight(stars: number, maxStars: number): number {
  if (maxStars <= 0) return 1;
  return clamp(Math.round(1 + (3 * Math.log(stars + 1)) / Math.log(maxStars + 1)), 1, 4);
}
