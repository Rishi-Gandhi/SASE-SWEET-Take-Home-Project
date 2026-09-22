import type { GitHubRepo, GitHubUser } from '../types';

let nextId = 1;

export function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: nextId++,
    name: 'repo',
    full_name: 'octocat/repo',
    html_url: 'https://github.com/octocat/repo',
    description: null,
    language: null,
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    open_issues_count: 0,
    topics: [],
    fork: false,
    archived: false,
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    homepage: null,
    license: null,
    ...overrides,
  };
}

export function makeUser(overrides: Partial<GitHubUser> = {}): GitHubUser {
  return {
    login: 'octocat',
    name: 'The Octocat',
    avatar_url: 'https://avatars.githubusercontent.com/u/1',
    html_url: 'https://github.com/octocat',
    bio: 'Builds things',
    location: null,
    company: null,
    blog: null,
    followers: 12,
    following: 3,
    public_repos: 2,
    created_at: '2011-01-25T18:44:36Z',
    ...overrides,
  };
}
