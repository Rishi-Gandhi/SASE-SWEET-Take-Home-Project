import { useCallback, useEffect, useState } from 'react';
import { GitHubError, fetchProfile } from '../lib/github';
import type { Profile } from '../types';

export type ProfileState =
  | { status: 'idle' }
  | { status: 'loading'; username: string }
  | { status: 'ready'; profile: Profile }
  | { status: 'error'; username: string; error: GitHubError };

/**
 * Successful lookups are kept for the life of the page. Anonymous callers get
 * 60 requests/hour, so revisiting a user via browser-back should cost nothing.
 */
const cache = new Map<string, Profile>();
const CACHE_LIMIT = 20;

function remember(key: string, profile: Profile): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, profile);
}

export function useProfile(username: string): { state: ProfileState; retry: () => void } {
  const [state, setState] = useState<ProfileState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const login = username.trim();
    if (!login) {
      setState({ status: 'idle' });
      return;
    }

    const key = login.toLowerCase();
    const cached = cache.get(key);
    if (cached && attempt === 0) {
      setState({ status: 'ready', profile: cached });
      return;
    }

    // Every keystroke-committed search supersedes the one before it. Aborting
    // the old request is what stops a slow response for "tor" from landing
    // after a fast one for "torvalds" and overwriting it.
    const controller = new AbortController();
    setState({ status: 'loading', username: login });

    fetchProfile(login, controller.signal)
      .then((profile) => {
        remember(key, profile);
        setState({ status: 'ready', profile });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          username: login,
          error:
            err instanceof GitHubError
              ? err
              : new GitHubError('unknown', 'Something went wrong loading that profile.'),
        });
      });

    return () => controller.abort();
  }, [username, attempt]);

  return { state, retry };
}
