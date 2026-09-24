import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { makeRepo, makeUser } from './fixtures';
import { resetRateLimit } from '../lib/rateLimit';

const REPOS = [
  makeRepo({
    name: 'kernel',
    html_url: 'https://github.com/octocat/kernel',
    stargazers_count: 900,
    language: 'C',
    description: 'An operating system kernel',
  }),
  makeRepo({
    name: 'toolbox',
    html_url: 'https://github.com/octocat/toolbox',
    stargazers_count: 120,
    language: 'Rust',
    description: 'Command line helpers',
  }),
  makeRepo({
    name: 'dotfiles',
    html_url: 'https://github.com/octocat/dotfiles',
    stargazers_count: 4,
    language: 'Shell',
    description: 'Personal config',
  }),
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

/** The repository names in the "All repositories" grid, in display order. */
function listed(): string[] {
  const list = screen.getByRole('list', { name: /all repositories/i });
  return within(list)
    .getAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent ?? '');
}

/** Waits for the grid to appear, then reads it. */
async function findListed(): Promise<string[]> {
  await screen.findByRole('list', { name: /all repositories/i });
  return listed();
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

    expect(await screen.findByRole('heading', { name: '@octocat' })).toBeInTheDocument();
    expect(listed()).toEqual(['kernel', 'toolbox', 'dotfiles']);
  });

  it('links every repository to its page on GitHub', async () => {
    stubGitHub();
    render(<App />);
    await search('link-user');
    await findListed();

    const list = screen.getByRole('list', { name: /all repositories/i });
    const link = within(list).getByRole('link', { name: 'View on GitHub: kernel' });
    expect(link).toHaveAttribute('href', 'https://github.com/octocat/kernel');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('filters the list as you type and reports how many are left', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('filter-user');

    const filter = await screen.findByLabelText(/filter repositories/i);
    await user.type(filter, 'command line');

    await waitFor(() =>
      expect(screen.getByText('Showing 1 of 3 repositories · sorted by stars')).toBeInTheDocument(),
    );
    expect(listed()).toEqual(['toolbox']);
  });

  it('offers a way out when the filters match nothing', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('nomatch-user');

    const filter = await screen.findByLabelText(/filter repositories/i);
    await user.type(filter, 'zzzzz');

    expect(await screen.findByText(/nothing matches those filters/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(listed()).toEqual(['kernel', 'toolbox', 'dotfiles']));
  });

  it('scopes the list when a language segment is clicked', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('lang-user');

    const segment = await screen.findByRole('button', { name: /filter by C$/i });
    await user.click(segment);

    await waitFor(() =>
      expect(screen.getByText('Showing 1 of 3 repositories · sorted by stars')).toBeInTheDocument(),
    );
    expect(listed()).toEqual(['kernel']);
  });

  it('filters by a language chip, and "All languages" undoes it', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('chip-user');
    await findListed();

    const chips = screen.getByRole('group', { name: /filter by language/i });
    await user.click(within(chips).getByRole('button', { name: 'Rust' }));

    expect(listed()).toEqual(['toolbox']);
    expect(within(chips).getByRole('button', { name: 'Rust' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(window.location.search).toContain('lang=Rust'));

    await user.click(within(chips).getByRole('button', { name: 'All languages' }));
    expect(listed()).toEqual(['kernel', 'toolbox', 'dotfiles']);
  });

  it('sorts from the segmented control and says how it is sorted', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('segment-user');
    await findListed();

    const sort = screen.getByRole('group', { name: /sort repositories/i });
    expect(within(sort).getByRole('button', { name: 'Stars' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(sort).getByRole('button', { name: 'Name A–Z' }));

    expect(listed()).toEqual(['dotfiles', 'kernel', 'toolbox']);
    expect(within(sort).getByRole('button', { name: 'Name A–Z' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Showing 3 of 3 repositories · sorted by name')).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toContain('sort=name'));
  });

  it('hides forks on request', async () => {
    stubGitHub({
      repos: [...REPOS, makeRepo({ name: 'borrowed', fork: true, stargazers_count: 2, language: 'C' })],
    });
    render(<App />);
    const user = await search('forks-user');
    expect(await findListed()).toContain('borrowed');

    await user.click(screen.getByRole('button', { name: 'Hide forks' }));

    expect(listed()).not.toContain('borrowed');
    expect(screen.getByRole('button', { name: 'Hide forks' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(window.location.search).toContain('src=1'));
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

    expect(await findListed()).toEqual(['toolbox']);
    expect(screen.getByLabelText(/github username/i)).toHaveValue('shared-user');
  });

  it('features the most-starred repositories in the carousel', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('carousel-user');

    const carousel = await screen.findByRole('group', { name: /top repositories/i });
    const slides = within(carousel).getAllByRole('group');
    expect(slides.map((slide) => slide.getAttribute('aria-label'))).toEqual([
      '1 of 3: kernel',
      '2 of 3: toolbox',
      '3 of 3: dotfiles',
    ]);
    expect(within(slides[0]!).getByRole('link', { name: 'Open on GitHub: kernel' })).toHaveAttribute(
      'href',
      'https://github.com/octocat/kernel',
    );
    expect(slides[0]).toHaveClass('is-active');

    // The buttons and the arrow keys move the active card, wrapping round.
    await user.click(screen.getByRole('button', { name: /next repository/i }));
    expect(slides[1]).toHaveClass('is-active');
    await user.click(screen.getByRole('button', { name: /previous repository/i }));
    await user.click(screen.getByRole('button', { name: /previous repository/i }));
    expect(slides[2]).toHaveClass('is-active');

    carousel.focus();
    await user.keyboard('{ArrowRight}');
    expect(slides[0]).toHaveClass('is-active');
  });

  it('keeps the carousel on the whole account while the list is filtered', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('portrait-user');
    await user.type(await screen.findByLabelText(/filter repositories/i), 'dotfiles');

    await waitFor(() => expect(listed()).toEqual(['dotfiles']));
    const carousel = screen.getByRole('group', { name: /top repositories/i });
    expect(within(carousel).getAllByRole('group')).toHaveLength(3);
  });

  it('explains a username that does not exist', async () => {
    stubGitHub({ status: 404 });
    render(<App />);
    await search('nobodyhere');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/no github user called/i)).toBeInTheDocument();
    expect(within(alert).queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    // The hero says it in one line, right under the field.
    expect(screen.getByLabelText(/github username/i)).toHaveAccessibleDescription(
      'No GitHub user named @nobodyhere.',
    );
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
    expect(screen.getByLabelText(/github username/i)).toHaveAccessibleDescription(
      /hourly limit for unauthenticated requests is used up\. it resets in about 30 minutes/i,
    );
  });

  it('distinguishes an account with no public repos from a failure', async () => {
    stubGitHub({ repos: [], user: makeUser({ public_repos: 0 }) });
    render(<App />);
    await search('barren-user');

    expect(await screen.findByRole('heading', { name: /no public repositories/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/github username/i)).toHaveAccessibleDescription(
      /opened @octocat: no public repositories yet/i,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /top repositories/i })).not.toBeInTheDocument();
  });

  it('opens the command palette on the keyboard and runs a command from it', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('palette-user');
    await findListed();

    await user.keyboard('{Meta>}k{/Meta}');
    const palette = await screen.findByRole('dialog', { name: /command palette/i });

    await user.keyboard('name');
    const option = within(palette).getByRole('option', { name: /sort by name/i });
    await user.click(option);

    // The palette closes and the list is now alphabetical.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(listed()).toEqual(['dotfiles', 'kernel', 'toolbox']);
  });

  it('closes the palette on Escape without changing anything', async () => {
    stubGitHub();
    render(<App />);
    const user = await search('escape-user');
    await findListed();

    await user.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(listed()).toEqual(['kernel', 'toolbox', 'dotfiles']);
  });

  it('filters by a topic chip, puts it in the URL, and lets it be removed', async () => {
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

    await waitFor(() =>
      expect(screen.getByText('Showing 1 of 2 repositories · sorted by stars')).toBeInTheDocument(),
    );
    expect(listed()).toEqual(['toolbox']);
    await waitFor(() => expect(window.location.search).toContain('topic=cli'));

    await user.click(screen.getByRole('button', { name: /remove topic filter: cli/i }));
    expect(listed()).toEqual(['kernel', 'toolbox']);
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
    await findListed();

    await user.click(screen.getByRole('button', { name: /compare with/i }));
    await user.type(screen.getByLabelText(/second account/i), 'second');
    await user.click(screen.getByRole('button', { name: /^compare$/i }));

    // Both accounts are present and the grid now holds both accounts' repos.
    expect(await screen.findByRole('region', { name: /comparison/i })).toBeInTheDocument();
    await waitFor(() => expect(listed()).toEqual(['kernel', 'ripgrep']));
    expect(screen.getByText('Showing 2 of 2 repositories · sorted by stars')).toBeInTheDocument();
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
    expect(listed()).toContain('kernel');
    expect(screen.queryByRole('region', { name: /comparison/i })).not.toBeInTheDocument();
  });

  it('pins an account and offers it again on the idle screen', async () => {
    stubGitHub();
    const first = render(<App />);
    const user = await search('pin-me');
    await findListed();

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
    await findListed();

    const items = document.querySelectorAll('li[data-flip-id]');
    expect(items).toHaveLength(3);
    // The delay is capped, and every card carries one.
    for (const item of items) {
      const delay = (item as HTMLElement).style.getPropertyValue('--enter-delay');
      expect(delay).toMatch(/^\d+ms$/);
      expect(Number.parseInt(delay, 10)).toBeLessThanOrEqual(8 * 35);
    }
  });

  it('does not repaint existing language colours when a comparison starts', async () => {
    // Primary writes C; the second account is overwhelmingly Python. Colours
    // are keyed by language name, so nothing already on screen may change.
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
    await findListed();
    const dotColour = () =>
      within(screen.getByRole('list', { name: /all repositories/i }))
        .getByRole('button', { name: /^C$/ })
        .querySelector('span[aria-hidden]')
        ?.getAttribute('style');

    const before = dotColour();
    // GitHub's colour for C, #555555.
    expect(before).toContain('rgb(85, 85, 85)');

    // Start comparing via a shared link rather than the form, to keep it short.
    window.history.pushState(null, '', '/?u=cdev&vs=pythonist');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(screen.getByRole('region', { name: /comparison/i })).toBeInTheDocument());
    expect(dotColour()).toBe(before);
  });

  it('narrates the search in the hint under the field', async () => {
    stubGitHub();
    render(<App />);
    const field = screen.getByLabelText(/github username/i);
    expect(field).toHaveAccessibleDescription(/try: torvalds/i);

    // The stub answers every handle with the octocat fixture.
    await search('hint-user');
    await waitFor(() =>
      expect(field).toHaveAccessibleDescription(/opened @octocat: 3 public repositories\. see them below/i),
    );
  });

  it('asks for a username instead of clearing the view on an empty submit', async () => {
    const fetchMock = stubGitHub();
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^open box$/i }));

    expect(screen.getByLabelText(/github username/i)).toHaveAccessibleDescription(
      'Type a GitHub username first.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('treats a pasted "@handle" as the handle', async () => {
    stubGitHub();
    render(<App />);
    await search('@at-user');

    await waitFor(() => expect(window.location.search).toContain('u=at-user'));
    expect(window.location.search).not.toContain('%40');
  });

  it('brings the results into view once an opened account is ready', async () => {
    stubGitHub();
    const scrolled: Element[] = [];
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
      scrolled.push(this);
    });
    render(<App />);
    await search('scroll-user');

    await waitFor(() => expect(scrolled.map((element) => element.id)).toContain('repositories'));
    spy.mockRestore();
  });

  it('explains itself in three readable steps', () => {
    stubGitHub();
    render(<App />);

    const how = screen.getByRole('region', { name: /one username in\. ?every repo out\./i });
    const steps = within(how).getAllByRole('listitem');
    expect(steps.map((step) => step.textContent)).toEqual([
      '01Enter a usernameType any GitHub username.',
      "02Fetch public reposRepoBox calls GitHub's public API.",
      '03Sort & filterOrder by stars or name, then search.',
    ]);
  });
});
