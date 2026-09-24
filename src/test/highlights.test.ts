import { describe, expect, it } from 'vitest';
import { topRepos } from '../lib/highlights';
import { makeRepo } from './fixtures';

describe('topRepos', () => {
  const repos = [
    makeRepo({ name: 'middle', stargazers_count: 40 }),
    makeRepo({ name: 'most', stargazers_count: 900 }),
    makeRepo({ name: 'tie-b', stargazers_count: 5 }),
    makeRepo({ name: 'tie-a', stargazers_count: 5 }),
    makeRepo({ name: 'none', stargazers_count: 0 }),
  ];

  it('ranks by stars, breaking ties by name like the Most stars sort', () => {
    expect(topRepos(repos, 5).map((repo) => repo.name)).toEqual(['most', 'middle', 'tie-a', 'tie-b', 'none']);
  });

  it('returns at most the requested count', () => {
    expect(topRepos(repos, 2).map((repo) => repo.name)).toEqual(['most', 'middle']);
    expect(topRepos(repos.slice(0, 1), 6)).toHaveLength(1);
    expect(topRepos([], 6)).toEqual([]);
  });

  it('includes forks, because highlights describe the whole account', () => {
    const withFork = [...repos, makeRepo({ name: 'popular-fork', stargazers_count: 5000, fork: true })];
    expect(topRepos(withFork, 1)[0]?.name).toBe('popular-fork');
  });

  it('does not reorder the array it was given', () => {
    const before = repos.map((repo) => repo.name);
    topRepos(repos, 3);
    expect(repos.map((repo) => repo.name)).toEqual(before);
  });
});
