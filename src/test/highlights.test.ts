import { describe, expect, it } from 'vitest';
import { topRepos, towerHeight } from '../lib/highlights';
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

describe('towerHeight', () => {
  it('gives the leader the full four cubes', () => {
    expect(towerHeight(2418, 2418)).toBe(4);
  });

  it('never drops below one cube, even for no stars', () => {
    expect(towerHeight(0, 2418)).toBe(1);
    expect(towerHeight(0, 0)).toBe(1);
  });

  it('scales by order of magnitude rather than linearly', () => {
    // 50 stars is 2% of 2,418 — a single cube linearly, but a real presence
    // on a log scale.
    expect(towerHeight(50, 2418)).toBe(3);
    expect(towerHeight(12, 2418)).toBe(2);
  });

  it('keeps the heights ordered with the stars', () => {
    const heights = [0, 3, 12, 50, 400, 2418].map((stars) => towerHeight(stars, 2418));
    expect([...heights].sort((a, b) => a - b)).toEqual(heights);
  });
});
