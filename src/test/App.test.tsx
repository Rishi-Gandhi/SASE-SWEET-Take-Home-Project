import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { makeRepo, makeUser } from './fixtures';

const REPOS = [
  makeRepo({ name: 'kernel', stargazers_count: 900, language: 'C', description: 'An operating system kernel' }),
  makeRepo({ name: 'toolbox', stargazers_count: 120, language: 'Rust', description: 'Command line helpers' }),
  makeRepo({ name: 'dotfiles', stargazers_count: 4, language: 'Shell', description: 'Personal config' }),
];

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

/** Routes the two endpoints the app calls; `repos` defaults to the fixture set. */
function stubGitHub(options: { repos?: unknown; user?: unknown; status?: number } = {}) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (options.status && options.status !== 200) return Promise.resolve(json({}, { status: options.status }));
    return Promise.resolve(
      url.includes('/repos') ? json(options.repos ?? REPOS) : json(options.user ?? makeUser()),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function search(name: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/github username/i), name);
  await user.click(screen.getByRole('button', { name: /explore/i }));
  return user;
}

// Each test looks up a different username on purpose: successful profiles are
// cached for the life of the module, so reusing one handle would serve the
// previous test's fixture instead of the stub this test set up.
beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(() => vi.unstubAllGlobals());

describe('Repo Deck', () => {
  it('starts on the idle state with something to try', () => {
    stubGitHub();
    render(<App />);
    expect(screen.getByRole('button', { name: 'torvalds' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('loads a profile and lists repos with the biggest first', async () => {
    stubGitHub();
    render(<App />);
    await search('sorted-user');

    expect(await screen.findByRole('heading', { name: /the octocat/i })).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: /kernel|toolbox|dotfiles/ });
    expect(links.map((link) => link.textContent)).toEqual(['kernel', 'toolbox', 'dotfiles']);
  });

  it('filters the list as you type and reports how many are left', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('filter-user');

    const filter = await screen.findByLabelText(/filter repositories/i);
    await user.type(filter, 'command line');

    await waitFor(() => expect(screen.getByText('1 of 3 repositories')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'toolbox' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'kernel' })).not.toBeInTheDocument();
  });

  it('offers a way out when the filters match nothing', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('nomatch-user');

    const filter = await screen.findByLabelText(/filter repositories/i);
    await user.type(filter, 'zzzzz');

    expect(await screen.findByText(/nothing matches those filters/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.getByRole('link', { name: 'kernel' })).toBeInTheDocument());
  });

  it('scopes the list when a language segment is clicked', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('lang-user');

    const segment = await screen.findByRole('button', { name: /filter by C$/i });
    await user.click(segment);

    await waitFor(() => expect(screen.getByText('1 of 3 repositories')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'kernel' })).toBeInTheDocument();
  });

  it('keeps the view in the URL so it can be shared', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('url-user');

    const filter = await screen.findByLabelText(/filter repositories/i);
    await user.type(filter, 'kernel');

    await waitFor(() => {
      expect(window.location.search).toContain('u=url-user');
      expect(window.location.search).toContain('q=kernel');
    });
  });

  it('restores a shared link on load without touching the search box', async () => {
    stubGitHub();
    window.history.replaceState(null, '', '/?u=shared-user&q=toolbox&sort=name');
    render(<App />);

    expect(await screen.findByRole('link', { name: 'toolbox' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'kernel' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/github username/i)).toHaveValue('shared-user');
  });

  it('explains a username that does not exist', async () => {
    stubGitHub({ status: 404 });
    render(<App />);
    await search('nobodyhere');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/no github user called/i)).toBeInTheDocument();
    expect(within(alert).queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('explains an exhausted rate limit and offers a retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({}, {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1800),
          },
        }),
      ),
    );
    render(<App />);
    await search('limited-user');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/rate limit reached/i)).toBeInTheDocument();
    expect(within(alert).getByText(/in about 30 minutes/i)).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('distinguishes an account with no public repos from a failure', async () => {
    stubGitHub({ repos: [], user: makeUser({ public_repos: 0 }) });
    render(<App />);
    await search('barren-user');

    expect(await screen.findByText(/no public repositories/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
