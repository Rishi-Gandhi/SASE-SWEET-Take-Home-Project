import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import type { CondensedProfile } from './components/TopBar';
import { ProfileCard } from './components/ProfileCard';
import { CompareSheet } from './components/CompareSheet';
import { FilterBar } from './components/FilterBar';
import { RepoCard } from './components/RepoCard';
import { CommandPalette } from './components/CommandPalette';
import { RateLimitMeter } from './components/RateLimitMeter';
import { ErrorState, IdleState, LoadingState, NoMatchesState, NoReposState } from './components/states';
import { useDeckState } from './hooks/useDeckState';
import { useProfile } from './hooks/useProfile';
import { useTheme } from './hooks/useTheme';
import { useRecentUsers } from './hooks/useRecentUsers';
import { usePinnedUsers } from './hooks/usePinnedUsers';
import { useFlipReorder } from './hooks/useFlipReorder';
import { useScrolledPast } from './hooks/useScrolledPast';
import { languageOptions, selectRepos, topicOptions, totalStars } from './lib/repos';
import { buildSpectrum, languageColorMap } from './lib/spectrum';
import { buildActivity } from './lib/activity';
import { compareProfiles, mergeRepos, repoOwner } from './lib/compare';

/** Cards cascade in, but the cascade is capped so a long list is not a wait. */
const STAGGER_MS = 22;
const STAGGER_CAP = 14;

export default function App() {
  const { state, update, setUsername } = useDeckState();
  const { state: profileState, retry } = useProfile(state.username);
  const { state: vsState } = useProfile(state.vs ?? '');
  const { theme, toggleTheme } = useTheme();
  const { recent, remember } = useRecentUsers();
  const { pinned, isPinned, togglePin } = usePinnedUsers();
  const [paletteOpen, setPaletteOpen] = useState(false);
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
   * Sheet 01 always describes the PRIMARY account — its spectrum, activity and
   * star total come from that account's unfiltered repos, so they never repaint
   * when you filter the grid or start a comparison.
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

  /*
   * One colour, one meaning, page-wide: the key is Sheet 01's spectrum and
   * nothing else. Keying card dots to the merged pool instead was tried and
   * reverted — it meant that starting a comparison REPAINTED languages already
   * on screen (C went from orange to grey), which is the recolour-on-filter
   * anti-pattern. Repos in a language outside the primary account's top three
   * get the neutral, which while comparing is itself informative: coloured
   * means "a language this account actually works in".
   */
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

  const collapsed = useScrolledPast(sheetNode);

  const condensed: CondensedProfile | null =
    collapsed && profile
      ? {
          login: profile.user.login,
          name: profile.user.name ?? profile.user.login,
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

  return (
    <div className="min-h-dvh">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-ink"
      >
        Skip to results
      </a>

      <TopBar
        username={state.username}
        onSubmit={setUsername}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
        busy={profileState.status === 'loading'}
        condensed={condensed}
      />

      <main id="results" className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
        {profileState.status === 'idle' && (
          <IdleState onPick={setUsername} pinned={pinned} recent={recent} />
        )}

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
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 font-mono text-[11px] text-ink-3 sm:px-6">
          <p>
            Drawn from the{' '}
            <a
              href="https://docs.github.com/en/rest/repos/repos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent hover:underline"
            >
              GitHub REST API
            </a>
            , unauthenticated.
          </p>
          <RateLimitMeter />
        </div>
      </footer>

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
        theme={theme}
        hasFilters={hasFilters}
        onPickUser={setUsername}
        onCompare={startComparing}
        onStopCompare={stopComparing}
        onTogglePin={togglePin}
        onSort={(sort) => update({ sort })}
        onToggleForks={() => update({ sourcesOnly: !state.sourcesOnly })}
        onToggleTheme={toggleTheme}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
