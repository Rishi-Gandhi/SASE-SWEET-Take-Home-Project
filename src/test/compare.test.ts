import { describe, expect, it } from 'vitest';
import { compareProfiles, mergeRepos, repoOwner } from '../lib/compare';
import type { Profile } from '../types';
import { makeRepo, makeUser } from './fixtures';

function makeProfile(overrides: Partial<Profile['user']>, repos: Profile['repos']): Profile {
  return { user: makeUser(overrides), repos, truncated: false };
}

const alice = makeProfile({ login: 'alice', public_repos: 12, followers: 900, following: 30 }, [
  makeRepo({ full_name: 'alice/one', language: 'Rust', topics: ['cli', 'parser'] }),
  makeRepo({ full_name: 'alice/two', language: 'Go', topics: ['cli'] }),
  makeRepo({ full_name: 'alice/three', language: null, topics: [] }),
]);

const bob = makeProfile({ login: 'bob', public_repos: 340, followers: 45, following: 30 }, [
  makeRepo({ full_name: 'bob/x', language: 'Go', topics: ['parser', 'web'] }),
  makeRepo({ full_name: 'bob/y', language: 'Python', topics: [] }),
]);

describe('compareProfiles', () => {
  it('scales every metric to its own larger value, not a shared axis', () => {
    const { metrics } = compareProfiles(alice, bob, 5000, 120);

    const repos = metrics.find((m) => m.label === 'Repos');
    const stars = metrics.find((m) => m.label === 'Stars');

    expect(repos).toMatchObject({ a: 12, b: 340, max: 340 });
    expect(stars).toMatchObject({ a: 5000, b: 120, max: 5000 });
    // Each row has its own maximum — the two never share one scale.
    expect(repos?.max).not.toBe(stars?.max);
  });

  it('never divides by zero when both accounts are empty on a metric', () => {
    const empty = makeProfile({ login: 'empty', public_repos: 0, followers: 0, following: 0 }, []);
    const { metrics } = compareProfiles(empty, empty, 0, 0);
    expect(metrics.every((m) => m.max >= 1)).toBe(true);
  });

  it('finds languages present in both accounts', () => {
    const { sharedLanguages } = compareProfiles(alice, bob, 0, 0);
    expect(sharedLanguages).toEqual(['Go']);
  });

  it('finds topics present in both accounts, sorted', () => {
    const { sharedTopics } = compareProfiles(alice, bob, 0, 0);
    expect(sharedTopics).toEqual(['parser']);
  });

  it('reports no overlap rather than failing when there is none', () => {
    const solo = makeProfile({ login: 'solo' }, [
      makeRepo({ full_name: 'solo/a', language: 'Elm', topics: ['ui'] }),
    ]);
    const result = compareProfiles(alice, solo, 0, 0);
    expect(result.sharedLanguages).toEqual([]);
    expect(result.sharedTopics).toEqual([]);
  });
});

describe('mergeRepos', () => {
  it('keeps every repo from both accounts', () => {
    expect(mergeRepos(alice.repos, bob.repos)).toHaveLength(5);
  });

  it('produces unique ids, so the merged list needs no dedupe', () => {
    const merged = mergeRepos(alice.repos, bob.repos);
    expect(new Set(merged.map((r) => r.id)).size).toBe(merged.length);
  });
});

describe('repoOwner', () => {
  it('reads the owner off full_name', () => {
    expect(repoOwner(makeRepo({ full_name: 'octocat/hello' }))).toBe('octocat');
  });

  it('returns an empty string rather than throwing on a malformed name', () => {
    expect(repoOwner(makeRepo({ full_name: '' }))).toBe('');
  });
});
