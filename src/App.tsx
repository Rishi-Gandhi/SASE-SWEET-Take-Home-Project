import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import type { CondensedProfile } from './components/TopBar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ProfileHeader } from './components/ProfileHeader';
import { CompareSheet } from './components/CompareSheet';
import { TopReposCarousel } from './components/TopReposCarousel';
import { RepoControls } from './components/RepoControls';
import { RepoList } from './components/RepoList';
import { CommandPalette } from './components/CommandPalette';
import { RateLimitMeter } from './components/RateLimitMeter';
import { ErrorState, LoadingState, NoMatchesState, NoReposState, ReposIdle } from './components/states';
import { useDeckState } from './hooks/useDeckState';
import { useProfile } from './hooks/useProfile';
import { useRecentUsers } from './hooks/useRecentUsers';
import { usePinnedUsers } from './hooks/usePinnedUsers';
import { useFlipReorder } from './hooks/useFlipReorder';
import { useScrolledPast } from './hooks/useScrolledPast';
import { useActiveSection } from './hooks/useActiveSection';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { languageOptions, selectRepos, totalStars } from './lib/repos';
import { buildSpectrum } from './lib/spectrum';
import { buildActivity } from './lib/activity';
import { compareProfiles, mergeRepos } from './lib/compare';

/** Page sections, top to bottom, and what the breadcrumb calls each. */
const SECTIONS = ['hero', 'how-it-works', 'repositories'] as const;
const CRUMBS: Record<string, string> = {
  hero: 'Hero',
  'how-it-works': 'How it works',
  repositories: 'Repositories',
};

export default function App() {
  const { state, update, setUsername } = useDeckState();
  const { state: profileState, retry } = useProfile(state.username);
  const { state: vsState } = useProfile(state.vs ?? '');
  const { recent, remember } = useRecentUsers();
  const { pinned, isPinned, togglePin } = usePinnedUsers();
  const reducedMotion = usePrefersReducedMotion();
  const activeSection = useActiveSection(SECTIONS);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  // Held in state, not a ref: it mounts only once a profile loads.
  const [headerNode, setHeaderNode] = useState<HTMLElement | null>(null);

  const profile = profileState.status === 'ready' ? profileState.profile : null;
  const vsProfile = vsState.status === 'ready' ? vsState.profile : null;
  const comparing = Boolean(state.vs) && Boolean(vsProfile);

  // Only successful lookups are worth remembering.
  useEffect(() => {
    if (profile) remember(profile.user.login);
  }, [profile, remember]);

  /*
   * The profile header always describes the PRIMARY account — its spectrum,
   * activity and star total come from that account's unfiltered repos, so
   * they never repaint when you filter the grid or start a comparison.
   */
  const spectrum = useMemo(() => buildSpectrum(profile?.repos ?? []), [profile]);
  const activity = useMemo(() => buildActivity(profile?.repos ?? []), [profile]);
  const stars = useMemo(() => totalStars(profile?.repos ?? []), [profile]);

  // The grid, and therefore the filter options, run over both accounts while
  // comparing. Ids are unique across GitHub, so the merge needs no dedupe.
  const pool = useMemo(() => {
    if (!profile) return [];
    return comparing && vsProfile ? mergeRepos(profile.repos, vsProfile.repos) : profile.repos;
  }, [profile, vsProfile, comparing]);

  const languages = useMemo(() => languageOptions(pool), [pool]);

  const comparison = useMemo(
    () =>
      profile && vsProfile
        ? compareProfiles(profile, vsProfile, stars, totalStars(vsProfile.repos))
        : null,
    [profile, vsProfile, stars],
  );

  const visible = useMemo(
    () =>
      selectRepos(pool, {
        search: state.search,
        language: state.language,
        topic: state.topic,
        sort: state.sort,
        sourcesOnly: state.sourcesOnly,
      }),
    [pool, state.search, state.language, state.topic, state.sort, state.sourcesOnly],
  );

  // Any change to ordering or membership is a reorder pass. Including the
  // logins means baseline positions are recorded the moment data lands, so the
  // very first sort change already animates.
  useFlipReorder(
    gridRef,
    [
      profile?.user.login,
      vsProfile?.user.login,
      state.sort,
      state.language,
      state.topic,
      state.search,
      state.sourcesOnly,
    ].join('|'),
  );

  // The top bar is 48px tall, so "scrolled past" starts beneath it.
  const collapsed = useScrolledPast(headerNode, '-48px 0px 0px 0px');

  const condensed: CondensedProfile | null =
    collapsed && profile
      ? {
          login: profile.user.login,
          avatarUrl: profile.user.avatar_url,
          repoCount: visible.length,
          spectrum,
        }
      : null;

  const hasFilters = Boolean(state.search || state.language || state.topic || state.sourcesOnly);
  const clearFilters = useCallback(
    () => update({ search: '', language: null, topic: null, sourcesOnly: false }),
    [update],
  );
  const stopComparing = useCallback(() => update({ vs: null }), [update]);
  const startComparing = useCallback((login: string) => update({ vs: login.trim() }), [update]);

  /*
   * Where the page goes once the profile being opened is ready. An explicit
   * open — the hero form, a suggestion, the palette — glides down to the
   * results; arriving on a shared link jumps straight there, because a link
   * to a view should open on that view. Back/Forward set nothing, so the
   * browser's own scroll position stands.
   */
  const scrollOnReady = useRef<ScrollBehavior | null>(state.username ? 'auto' : null);

  const scrollToResults = useCallback(
    (behavior: ScrollBehavior) => {
      document
        .getElementById('repositories')
        ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : behavior, block: 'start' });
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (profileState.status === 'error') scrollOnReady.current = null;
    if (profileState.status !== 'ready' || !scrollOnReady.current) return;
    const behavior = scrollOnReady.current;
    scrollOnReady.current = null;
    scrollToResults(behavior);
  }, [profileState, scrollToResults]);

  const openUser = useCallback(
    (login: string) => {
      // Re-opening the account already on screen loads nothing, so there is
      // no "ready" to wait for: go now. setUsername still resets the filters.
      if (profile?.user.login.toLowerCase() === login.toLowerCase()) {
        setUsername(login);
        scrollToResults('smooth');
        return;
      }
      scrollOnReady.current = 'smooth';
      setUsername(login);
    },
    [profile, setUsername, scrollToResults],
  );

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const focusSearch = useCallback(() => {
    const input = searchInputRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
    input.select();
  }, [reducedMotion]);

  useGlobalShortcuts({ onOpenPalette: openPalette, onFocusSearch: focusSearch });

  return (
    <div className="app">
      <a
        href="#repositories"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-14 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-accent"
      >
        Skip to results
      </a>

      <TopBar
        crumb={CRUMBS[activeSection] ?? 'Hero'}
        condensed={condensed}
        onOpenPalette={openPalette}
      />

      <main>
        <Hero
          username={state.username}
          profileState={profileState}
          pinned={pinned}
          recent={recent}
          reducedMotion={reducedMotion}
          inputRef={searchInputRef}
          onOpen={openUser}
          onSeeResults={() => scrollToResults('smooth')}
        />

        <HowItWorks />

        <section id="repositories" className="repos" aria-label="Repositories">
          <div className="wrap">
            {profileState.status === 'idle' && <ReposIdle onStart={focusSearch} />}

            {profileState.status === 'loading' && <LoadingState />}

            {profileState.status === 'error' && (
              <ErrorState error={profileState.error} username={profileState.username} onRetry={retry} />
            )}

            {profile && (
              <>
                <ProfileHeader
                  profile={profile}
                  totalStars={stars}
                  spectrum={spectrum}
                  activity={activity}
                  activeLanguage={state.language}
                  isPinned={isPinned(profile.user.login)}
                  comparing={Boolean(state.vs)}
                  onSelectLanguage={(language) => update({ language })}
                  onTogglePin={() => togglePin(profile.user.login)}
                  onCompare={startComparing}
                  headerRef={setHeaderNode}
                />

                {/* A failed second account must not take the first one down with
                    it — the comparison degrades, the page does not. */}
                {state.vs && vsState.status === 'loading' && (
                  <p className="panel label mt-8 p-4 text-muted">Loading @{state.vs} for comparison…</p>
                )}

                {state.vs && vsState.status === 'error' && (
                  <div
                    role="alert"
                    className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4"
                    style={{ borderColor: 'color-mix(in oklab, var(--critical) 45%, transparent)' }}
                  >
                    <p className="text-sm text-muted">
                      Could not load @{state.vs} — {vsState.error.message}
                    </p>
                    <button type="button" onClick={stopComparing} className="chip">
                      Stop comparing
                    </button>
                  </div>
                )}

                {comparing && vsProfile && comparison && (
                  <CompareSheet a={profile} b={vsProfile} comparison={comparison} onStop={stopComparing} />
                )}

                {pool.length === 0 ? (
                  <div className="mt-10">
                    <NoReposState login={profile.user.login} />
                  </div>
                ) : (
                  <>
                    {/* Keyed by account, so a new one starts from its first card. */}
                    <TopReposCarousel
                      key={profile.user.login}
                      repos={profile.repos}
                      reducedMotion={reducedMotion}
                    />

                    <section className="mt-14" aria-labelledby="all-heading">
                      <div className="sec-h">
                        <div>
                          <p className="label">Search · Sort · Filter</p>
                          <h3 id="all-heading" className="sec-title">
                            All repositories
                          </h3>
                        </div>
                      </div>

                      <RepoControls
                        search={state.search}
                        onSearchChange={(search) => update({ search })}
                        sort={state.sort}
                        onSortChange={(sort) => update({ sort })}
                        sourcesOnly={state.sourcesOnly}
                        onSourcesOnlyChange={(sourcesOnly) => update({ sourcesOnly })}
                        topic={state.topic}
                        onTopicChange={(topic) => update({ topic })}
                        language={state.language}
                        languages={languages}
                        onLanguageChange={(language) => update({ language })}
                        shown={visible.length}
                        total={pool.length}
                      />

                      {visible.length === 0 ? (
                        <NoMatchesState onClear={clearFilters} />
                      ) : (
                        <RepoList
                          repos={visible}
                          gridRef={gridRef}
                          comparing={comparing}
                          activeLanguage={state.language}
                          activeTopic={state.topic}
                          onSelectLanguage={(language) => update({ language })}
                          onSelectTopic={(topic) => update({ topic })}
                        />
                      )}
                    </section>
                  </>
                )}
              </>
            )}

            <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-faint pt-[18px]">
              <p className="label">
                RepoBox
                <em>
                  Built on{' '}
                  <a
                    href="https://docs.github.com/en/rest/repos/repos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-accent underline-offset-4 hover:text-fg"
                  >
                    GitHub&rsquo;s public API
                  </a>
                </em>
              </p>
              <RateLimitMeter />
            </footer>
          </div>
        </section>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        repos={visible}
        recent={recent}
        pinned={pinned}
        currentLogin={profile?.user.login ?? null}
        isPinned={isPinned}
        comparing={Boolean(state.vs)}
        sort={state.sort}
        sourcesOnly={state.sourcesOnly}
        hasFilters={hasFilters}
        onPickUser={openUser}
        onCompare={startComparing}
        onStopCompare={stopComparing}
        onTogglePin={togglePin}
        onSort={(sort) => update({ sort })}
        onToggleForks={() => update({ sourcesOnly: !state.sourcesOnly })}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
