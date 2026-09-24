import type { GitHubRepo } from '../types';
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
