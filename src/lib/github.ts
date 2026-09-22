import type { GitHubRepo, GitHubUser, Profile } from '../types';

const API_ROOT = 'https://api.github.com';
const PER_PAGE = 100;

/**
 * Hard cap on pagination. 5 pages = 500 repos, which covers all but a handful
 * of accounts. Unauthenticated callers get 60 requests/hour against the whole
 * IP, so an uncapped loop over a 3,000-repo org would burn the budget in one
 * search and leave the app unusable. When we stop early we say so in the UI
 * rather than silently showing a partial list.
 */
const MAX_PAGES = 5;

export type GitHubErrorKind =
  | 'not-found'
  | 'rate-limit'
  | 'network'
  | 'invalid-username'
  | 'unknown';

/** A fetch failure the UI knows how to render, as opposed to a raw Error. */
export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status?: number;
  /** Populated only for `rate-limit`: when the quota refills. */
  readonly resetAt?: Date;

  constructor(kind: GitHubErrorKind, message: string, opts: { status?: number; resetAt?: Date } = {}) {
    super(message);
    this.name = 'GitHubError';
    this.kind = kind;
    this.status = opts.status;
    this.resetAt = opts.resetAt;
  }
}

/**
 * GitHub's own rule: 1–39 chars, alphanumeric or single hyphens, no leading or
 * trailing hyphen. Checking locally turns a guaranteed-404 round trip into an
 * instant message and protects the rate-limit budget from typos.
 */
export function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(value);
}

function rateLimitResetAt(res: Response): Date | undefined {
  const reset = res.headers.get('x-ratelimit-reset');
  if (!reset) return undefined;
  const seconds = Number(reset);
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined;
}

/**
 * GitHub answers an exhausted quota with 403 (and 429 on the newer paths), so
 * the status alone is ambiguous — `x-ratelimit-remaining: 0` is what actually
 * distinguishes "slow down" from "forbidden".
 */
function isRateLimited(res: Response): boolean {
  if (res.status !== 403 && res.status !== 429) return false;
  return res.headers.get('x-ratelimit-remaining') === '0';
}

async function request<T>(path: string, signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  } catch (err) {
    // An aborted request is a cancellation, not a failure — let it through
    // untouched so the caller can ignore it.
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new GitHubError('network', 'Could not reach GitHub. Check your connection and try again.');
  }

  if (res.ok) return res.json() as Promise<T>;

  if (res.status === 404) {
    throw new GitHubError('not-found', 'No GitHub user by that name.', { status: 404 });
  }
  if (isRateLimited(res)) {
    throw new GitHubError('rate-limit', "GitHub's hourly rate limit for anonymous requests is used up.", {
      status: res.status,
      resetAt: rateLimitResetAt(res),
    });
  }
  throw new GitHubError('unknown', `GitHub responded with ${res.status}.`, { status: res.status });
}

/**
 * Pages through the repo list until GitHub returns a short page (the last one)
 * or we hit MAX_PAGES. Sorted by `updated` server-side purely to make the
 * truncation boundary meaningful: if we do stop early, the repos we dropped are
 * the least recently touched ones.
 */
async function fetchRepos(
  login: string,
  signal: AbortSignal,
): Promise<{ repos: GitHubRepo[]; truncated: boolean }> {
  const repos: GitHubRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await request<GitHubRepo[]>(
      `/users/${encodeURIComponent(login)}/repos?per_page=${PER_PAGE}&sort=updated&page=${page}`,
      signal,
    );
    repos.push(...batch);
    if (batch.length < PER_PAGE) return { repos, truncated: false };
  }

  return { repos, truncated: true };
}

/**
 * Fetches the profile and the repo list together. They're independent, so
 * running them in parallel halves the time to first paint; the cost is one
 * wasted request against the quota when the username doesn't exist.
 */
export async function fetchProfile(username: string, signal: AbortSignal): Promise<Profile> {
  const login = username.trim();

  if (!isValidUsername(login)) {
    throw new GitHubError(
      'invalid-username',
      'GitHub usernames are up to 39 letters, digits, or single hyphens.',
    );
  }

  const [user, repoResult] = await Promise.all([
    request<GitHubUser>(`/users/${encodeURIComponent(login)}`, signal),
    fetchRepos(login, signal),
  ]);

  return { user, repos: repoResult.repos, truncated: repoResult.truncated };
}
