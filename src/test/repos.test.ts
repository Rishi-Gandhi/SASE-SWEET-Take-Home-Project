import { describe, expect, it } from 'vitest';
import { languageOptions, selectRepos, totalStars } from '../lib/repos';
import type { RepoQuery } from '../lib/repos';
import { makeRepo } from './fixtures';

const BASE: RepoQuery = { search: '', language: null, sort: 'stars', sourcesOnly: false };

const repos = [
  makeRepo({ name: 'zebra', stargazers_count: 10, forks_count: 1, language: 'Go', pushed_at: '2024-06-01T00:00:00Z' }),
  makeRepo({ name: 'alpha', stargazers_count: 99, forks_count: 30, language: 'TypeScript', pushed_at: '2024-01-01T00:00:00Z', description: 'A parser for config files' }),
  makeRepo({ name: 'mid', stargazers_count: 50, forks_count: 2, language: 'Go', pushed_at: '2025-01-01T00:00:00Z', topics: ['cli', 'parser'] }),
  makeRepo({ name: 'forked-thing', stargazers_count: 75, forks_count: 0, language: 'Rust', fork: true, pushed_at: '2023-01-01T00:00:00Z' }),
];

const names = (list: ReturnType<typeof selectRepos>) => list.map((repo) => repo.name);

describe('selectRepos', () => {
  it('sorts by stars descending by default', () => {
    expect(names(selectRepos(repos, BASE))).toEqual(['alpha', 'forked-thing', 'mid', 'zebra']);
  });

  it('sorts by name case-insensitively', () => {
    expect(names(selectRepos(repos, { ...BASE, sort: 'name' }))).toEqual([
      'alpha',
      'forked-thing',
      'mid',
      'zebra',
    ]);
  });

  it('sorts by most recent push', () => {
    expect(names(selectRepos(repos, { ...BASE, sort: 'updated' }))).toEqual([
      'mid',
      'zebra',
      'alpha',
      'forked-thing',
    ]);
  });

  it('sorts by forks', () => {
    expect(names(selectRepos(repos, { ...BASE, sort: 'forks' }))[0]).toBe('alpha');
  });

  it('breaks star ties by name so the order stays stable', () => {
    const tied = [
      makeRepo({ name: 'beta', stargazers_count: 5 }),
      makeRepo({ name: 'alpha', stargazers_count: 5 }),
    ];
    expect(names(selectRepos(tied, BASE))).toEqual(['alpha', 'beta']);
  });

  it('matches the search against name, description, and topics', () => {
    expect(names(selectRepos(repos, { ...BASE, search: 'zeb' }))).toEqual(['zebra']);
    expect(names(selectRepos(repos, { ...BASE, search: 'config files' }))).toEqual(['alpha']);
    expect(names(selectRepos(repos, { ...BASE, search: 'cli' }))).toEqual(['mid']);
  });

  it('ignores case and surrounding whitespace in the search', () => {
    expect(names(selectRepos(repos, { ...BASE, search: '  ZEBRA  ' }))).toEqual(['zebra']);
  });

  it('filters by exact language', () => {
    expect(names(selectRepos(repos, { ...BASE, language: 'Go' }))).toEqual(['mid', 'zebra']);
  });

  it('hides forks when asked', () => {
    expect(names(selectRepos(repos, { ...BASE, sourcesOnly: true }))).not.toContain('forked-thing');
  });

  it('combines filters', () => {
    const result = selectRepos(repos, { ...BASE, language: 'Go', search: 'parser' });
    expect(names(result)).toEqual(['mid']);
  });

  it('does not mutate the input array', () => {
    const original = [...repos];
    selectRepos(repos, { ...BASE, sort: 'name' });
    expect(repos).toEqual(original);
  });
});

describe('languageOptions', () => {
  it('lists languages by frequency, skipping unclassified repos', () => {
    expect(languageOptions(repos)).toEqual([
      { language: 'Go', count: 2 },
      { language: 'Rust', count: 1 },
      { language: 'TypeScript', count: 1 },
    ]);
  });
});

describe('totalStars', () => {
  it('sums stars across every repo', () => {
    expect(totalStars(repos)).toBe(234);
  });

  it('is zero for an empty list', () => {
    expect(totalStars([])).toBe(0);
  });
});
