import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import type { CondensedProfile } from './components/TopBar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ProfileCard } from './components/ProfileCard';
import { CompareSheet } from './components/CompareSheet';
import { FilterBar } from './components/FilterBar';
import { RepoCard } from './components/RepoCard';
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
import { languageOptions, selectRepos, topicOptions, totalStars } from './lib/repos';
import { buildSpectrum, languageColorMap } from './lib/spectrum';
import { buildActivity } from './lib/activity';
import { compareProfiles, mergeRepos, repoOwner } from './lib/compare';

/** Cards cascade in, but the cascade is capped so a long list is not a wait. */
const STAGGER_MS = 22;
const STAGGER_CAP = 14;

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
  const [sheetNode, setSheetNode] = useState<HTMLDivElement | null>(null);

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
  const topics = useMemo(() => topicOptions(pool), [pool]);
  const colorMap = useMemo(() => languageColorMap(spectrum), [spectrum]);

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
  const collapsed = useScrolledPast(sheetNode, '-48px 0px 0px 0px');

  const condensed: CondensedProfile | null =
    collapsed && profile
      ? {
          login: profile.user.login,
          avatarUrl: profile.user.avatar_url,
          repoCount: visible.length,
          spectrum,
        }
      : null;

  // The bar scale is the biggest repo currently on screen, so the comparison
  // stays meaningful after filtering down to a handful of small projects.
  const maxStars = visible[0] ? Math.max(...visible.map((repo) => repo.stargazers_count)) : 0;

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
                <div ref={setSheetNode}>
                  <ProfileCard
                    profile={profile}
                    spectrum={spectrum}
                    activity={activity}
                    totalStars={stars}
                    activeLanguage={state.language}
                    isPinned={isPinned(profile.user.login)}
                    comparing={Boolean(state.vs)}
                    onSelectLanguage={(language) => update({ language })}
                    onTogglePin={() => togglePin(profile.user.login)}
                    onCompare={startComparing}
                  />
                </div>

                {/* A failed second account must not take the first one down with
                    it — the comparison degrades, the page does not. */}
                {state.vs && vsState.status === 'loading' && (
                  <p className="sheet mt-4 p-4 font-mono text-[12px] text-ink-3">
                    Loading @{state.vs} for comparison…
                  </p>
                )}

                {state.vs && vsState.status === 'error' && (
                  <div
                    role="alert"
                    className="sheet mt-4 flex flex-wrap items-center justify-between gap-3 p-4"
                    style={{ borderColor: 'color-mix(in oklab, var(--critical) 35%, transparent)' }}
                  >
                    <p className="font-mono text-[12px] text-ink-2">
                      Could not load @{state.vs} — {vsState.error.message}
                    </p>
                    <button
                      type="button"
                      onClick={stopComparing}
                      className="cursor-pointer rounded-[2px] border border-line px-2 py-1 font-mono text-[11px] text-ink-2 transition-colors hover:border-accent hover:text-accent"
                    >
                      Stop comparing
                    </button>
                  </div>
                )}

                {comparing && vsProfile && comparison && (
                  <CompareSheet
                    a={profile}
                    b={vsProfile}
                    comparison={comparison}
                    onStop={stopComparing}
                  />
                )}

                {pool.length === 0 ? (
                  <div className="mt-4">
                    <NoReposState login={profile.user.login} />
                  </div>
                ) : (
                  <div className="mt-5">
                    <FilterBar
                      search={state.search}
                      onSearchChange={(search) => update({ search })}
                      language={state.language}
                      languages={languages}
                      onLanguageChange={(language) => update({ language })}
                      topic={state.topic}
                      topics={topics}
                      onTopicChange={(topic) => update({ topic })}
                      sort={state.sort}
                      onSortChange={(sort) => update({ sort })}
                      sourcesOnly={state.sourcesOnly}
                      onSourcesOnlyChange={(sourcesOnly) => update({ sourcesOnly })}
                      shown={visible.length}
                      total={pool.length}
                    />

                    {visible.length === 0 ? (
                      <NoMatchesState onClear={clearFilters} />
                    ) : (
                      <ul ref={gridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visible.map((repo, index) => (
                          <li
                            key={repo.id}
                            data-flip-id={String(repo.id)}
                            // The lead card in the current ordering gets the lead
                            // cell, so the grid has a reading order instead of
                            // thirty identical boxes.
                            className={`h-full min-w-0 ${index === 0 ? 'sm:col-span-2' : ''}`}
                            style={
                              {
                                '--enter-delay': `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms`,
                              } as React.CSSProperties
                            }
                          >
                            <RepoCard
                              repo={repo}
                              figure={index + 1}
                              maxStars={maxStars}
                              principal={index === 0}
                              owner={comparing ? repoOwner(repo) : null}
                              languageColor={
                                (repo.language && colorMap.get(repo.language)) || 'var(--lang-other)'
                              }
                              isLanguageActive={state.language !== null && state.language === repo.language}
                              activeTopic={state.topic}
                              onSelectLanguage={(language) => update({ language })}
                              onSelectTopic={(topic) => update({ topic })}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
