import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubError, fetchProfile, isValidUsername } from '../lib/github';
import { makeRepo, makeUser } from './fixtures';

function respond(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('isValidUsername', () => {
  it('accepts real GitHub handles', () => {
    for (const name of ['torvalds', 'a', 'Rishi-Gandhi', 'user123', 'a-b-c']) {
      expect(isValidUsername(name), name).toBe(true);
    }
  });

  it('rejects handles GitHub itself would reject', () => {
    for (const name of ['', '-leading', 'trailing-', 'double--hyphen', 'has space', 'has_underscore', 'a'.repeat(40)]) {
      expect(isValidUsername(name), name).toBe(false);
    }
  });
});

describe('fetchProfile', () => {
  it('rejects an invalid username without touching the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchProfile('not valid!', new AbortController().signal)).rejects.toMatchObject({
      kind: 'invalid-username',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a 404 to a not-found error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({}, { status: 404 })));

    const error = await fetchProfile('ghost', new AbortController().signal).catch((e) => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect(error.kind).toBe('not-found');
  });

  it('maps an exhausted quota to a rate-limit error carrying the reset time', async () => {
    const resetSeconds = Math.floor(Date.now() / 1000) + 1800;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        respond({}, {
          status: 403,
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(resetSeconds) },
        }),
      ),
    );

    const error = await fetchProfile('torvalds', new AbortController().signal).catch((e) => e);
    expect(error.kind).toBe('rate-limit');
    expect(error.resetAt?.getTime()).toBe(resetSeconds * 1000);
  });

  it('does not mistake a plain 403 for a rate limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond({}, { status: 403 })));

    const error = await fetchProfile('torvalds', new AbortController().signal).catch((e) => e);
    expect(error.kind).toBe('unknown');
  });

  it('turns a failed connection into a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await fetchProfile('torvalds', new AbortController().signal).catch((e) => e);
    expect(error.kind).toBe('network');
  });

  it('lets an abort propagate untouched so callers can ignore it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    );

    const error = await fetchProfile('torvalds', new AbortController().signal).catch((e) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe('AbortError');
  });

  it('stops paging as soon as a short page comes back', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(makeUser()))
      .mockResolvedValueOnce(respond([makeRepo({ name: 'only' })]));
    vi.stubGlobal('fetch', fetchMock);

    const profile = await fetchProfile('octocat', new AbortController().signal);
    expect(profile.repos).toHaveLength(1);
    expect(profile.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('flags truncation when the account exceeds the page cap', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => makeRepo({ name: `repo-${i}` }));
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(url.includes('/repos') ? respond(fullPage) : respond(makeUser())),
    );
    vi.stubGlobal('fetch', fetchMock);

    const profile = await fetchProfile('bigorg', new AbortController().signal);
    expect(profile.truncated).toBe(true);
    expect(profile.repos).toHaveLength(500);
  });
});
