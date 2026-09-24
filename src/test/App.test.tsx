import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { makeRepo, makeUser } from './fixtures';
import { resetRateLimit } from '../lib/rateLimit';

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
function stubGitHub(
  options: { repos?: unknown; user?: unknown; status?: number; quota?: Record<string, string> } = {},
) {
  const init = options.quota ? { headers: options.quota } : {};
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (options.status && options.status !== 200) {
      return Promise.resolve(json({}, { status: options.status, ...init }));
    }
    return Promise.resolve(
      url.includes('/repos') ? json(options.repos ?? REPOS, init) : json(options.user ?? makeUser(), init),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function search(name: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/github username/i), name);
  await user.click(screen.getByRole('button', { name: /^open box$/i }));
  return user;
}

// Each test looks up a different username on purpose: successful profiles are
// cached for the life of the module, so reusing one handle would serve the
// previous test's fixture instead of the stub this test set up.
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetRateLimit();
});

describe('RepoBox', () => {
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

  it('opens the command palette on the keyboard and runs a command from it', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('palette-user');
    await screen.findByRole('link', { name: 'kernel' });

    await user.keyboard('{Meta>}k{/Meta}');
    const palette = await screen.findByRole('dialog', { name: /command palette/i });

    await user.keyboard('name');
    const option = within(palette).getByRole('option', { name: /sort by name/i });
    await user.click(option);

    // The palette closes and the list is now alphabetical.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const links = screen.getAllByRole('link', { name: /kernel|toolbox|dotfiles/ });
    expect(links.map((l) => l.textContent)).toEqual(['dotfiles', 'kernel', 'toolbox']);
  });

  it('closes the palette on Escape without changing anything', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('escape-user');
    await screen.findByRole('link', { name: 'kernel' });

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'kernel' })).toBeInTheDocument();
  });

  it('filters by a topic chip and puts it in the URL', async () => {
    stubGitHub({
      repos: [
        makeRepo({ name: 'kernel', stargazers_count: 900, language: 'C', topics: ['os', 'kernel'] }),
        makeRepo({ name: 'toolbox', stargazers_count: 120, language: 'Rust', topics: ['cli'] }),
      ],
    });
    render(<App />);
    const user = await search('topic-user');

    const chip = await screen.findByRole('button', { name: 'cli' });
    await user.click(chip);

    await waitFor(() => expect(screen.getByText('1 of 2 repositories')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'toolbox' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'kernel' })).not.toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toContain('topic=cli'));
  });

  it('shows the remaining API budget once GitHub reports it', async () => {
    stubGitHub({
      quota: {
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '48',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1800),
      },
    });
    render(<App />);
    await search('quota-user');

    const meter = await screen.findByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '48');
    expect(meter).toHaveAttribute('aria-valuemax', '60');
    expect(screen.getByText('48/60')).toBeInTheDocument();
  });

  it('gives the lead repository the lead cell', async () => {
    stubGitHub();
    render(<App />);
    await search('bento-user');

    const lead = await screen.findByRole('link', { name: 'kernel' });
    // The principal card is the one card that spans two columns.
    expect(lead.closest('li')).toHaveClass('sm:col-span-2');
    expect(screen.getByRole('link', { name: 'toolbox' }).closest('li')).not.toHaveClass(
      'sm:col-span-2',
    );
  });

  it('compares two accounts side by side and merges their repositories', async () => {
    // Route by handle so the two accounts return different data.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const forSecond = url.includes('/second');
        if (url.includes('/repos')) {
          return Promise.resolve(
            json(
              forSecond
                ? [makeRepo({ name: 'ripgrep', full_name: 'second/ripgrep', language: 'Rust', stargazers_count: 400 })]
                : [makeRepo({ name: 'kernel', full_name: 'first/kernel', language: 'C', stargazers_count: 900 })],
            ),
          );
        }
        return Promise.resolve(
          json(makeUser({ login: forSecond ? 'second' : 'first', public_repos: forSecond ? 1 : 1 })),
        );
      }),
    );

    render(<App />);
    const user = await search('first');
    await screen.findByRole('link', { name: 'kernel' });

    await user.click(screen.getByRole('button', { name: /compare with/i }));
    await user.type(screen.getByLabelText(/second account/i), 'second');
    await user.click(screen.getByRole('button', { name: /^compare$/i }));

    // Both sheets are present and the grid now holds both accounts' repos.
    expect(await screen.findByText(/sheet 02 — comparison/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'ripgrep' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'kernel' })).toBeInTheDocument();
    expect(screen.getByText('2 repositories')).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toContain('vs=second'));
  });

  it('keeps the first account when the second one fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/ghost')) return Promise.resolve(json({}, { status: 404 }));
        return Promise.resolve(url.includes('/repos') ? json(REPOS) : json(makeUser()));
      }),
    );

    // Arrive already comparing, via a shared link.
    window.history.replaceState(null, '', '/?u=solid&vs=ghost');
    render(<App />);

    // The failure is reported inline; the primary account still renders.
    expect(await screen.findByText(/could not load @ghost/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'kernel' })).toBeInTheDocument();
    expect(screen.queryByText(/sheet 02/i)).not.toBeInTheDocument();
  });

  it('pins an account and offers it again on the idle screen', async () => {
    stubGitHub();
    const first = render(<App />);
    const user = await search('pin-me');
    await screen.findByRole('link', { name: 'kernel' });

    await user.click(screen.getByRole('button', { name: /^pin$/i }));
    expect(await screen.findByRole('button', { name: /^pinned$/i })).toBeInTheDocument();

    // Unmount before remounting, so only one App is ever on screen.
    first.unmount();
    window.history.replaceState(null, '', '/');
    render(<App />);

    // The pin survived and is offered as a shortcut on the empty view.
    expect(await screen.findByRole('button', { name: 'octocat' })).toBeInTheDocument();
    expect(screen.getByText(/pinned/i)).toBeInTheDocument();
  });

  it('staggers the cards without leaving any of them invisible', async () => {
    stubGitHub();
    render(<App />);
    await search('stagger-user');
    await screen.findByRole('link', { name: 'kernel' });

    const items = document.querySelectorAll('li[data-flip-id]');
    expect(items).toHaveLength(3);
    // The delay is capped, and every card carries one.
    for (const item of items) {
      const delay = (item as HTMLElement).style.getPropertyValue('--enter-delay');
      expect(delay).toMatch(/^\d+ms$/);
      expect(Number.parseInt(delay, 10)).toBeLessThanOrEqual(14 * 22);
    }
  });

  it('does not repaint existing language colours when a comparison starts', async () => {
    // Primary writes C; the second account is overwhelmingly Python, so a key
    // derived from the merged pool would demote C out of the top three.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        const second = url.includes('/pythonist');
        if (url.includes('/repos')) {
          return Promise.resolve(
            json(
              second
                ? Array.from({ length: 8 }, (_, i) =>
                    makeRepo({ name: `py${i}`, full_name: `pythonist/py${i}`, language: 'Python' }),
                  )
                : [makeRepo({ name: 'kernel', full_name: 'cdev/kernel', language: 'C', stargazers_count: 900 })],
            ),
          );
        }
        return Promise.resolve(json(makeUser({ login: second ? 'pythonist' : 'cdev' })));
      }),
    );

    render(<App />);
    await search('cdev');
    const dotColour = () =>
      screen
        .getByRole('button', { name: /^C$/ })
        .querySelector('span[aria-hidden]')
        ?.getAttribute('style');

    await screen.findByRole('link', { name: 'kernel' });
    const before = dotColour();
    expect(before).toContain('--lang-1');

    // Start comparing via a shared link rather than the form, to keep it short.
    window.history.pushState(null, '', '/?u=cdev&vs=pythonist');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(screen.getByText(/sheet 02 — comparison/i)).toBeInTheDocument());
    // C is still the primary account's lead language, so it keeps its colour.
    expect(dotColour()).toBe(before);
  });
});
