/** The subset of GitHub's user payload this app actually renders. */
export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

/** The subset of GitHub's repo payload this app actually renders. */
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  topics: string[];
  fork: boolean;
  archived: boolean;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  license: { spdx_id: string | null; name: string } | null;
}

export interface Profile {
  user: GitHubUser;
  repos: GitHubRepo[];
  /** True when the account has more repos than we were willing to page through. */
  truncated: boolean;
}

export type SortKey = 'stars' | 'name' | 'updated' | 'forks';
