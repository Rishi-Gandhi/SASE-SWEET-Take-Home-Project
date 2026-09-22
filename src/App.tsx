import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { ProfileCard } from './components/ProfileCard';
import { FilterBar } from './components/FilterBar';
import { RepoCard } from './components/RepoCard';
import { CommandPalette } from './components/CommandPalette';
import { RateLimitMeter } from './components/RateLimitMeter';
import { ErrorState, IdleState, LoadingState, NoMatchesState, NoReposState } from './components/states';
import { useDeckState } from './hooks/useDeckState';
import { useProfile } from './hooks/useProfile';
import { useTheme } from './hooks/useTheme';
import { useRecentUsers } from './hooks/useRecentUsers';
import { useFlipReorder } from './hooks/useFlipReorder';
import { languageOptions, selectRepos, topicOptions, totalStars } from './lib/repos';
import { buildSpectrum, languageColorMap } from './lib/spectrum';
import { buildActivity } from './lib/activity';

export default function App() {
  const { state, update, setUsername } = useDeckState();
  const { state: profileState, retry } = useProfile(state.username);
  const { theme, toggleTheme } = useTheme();
  const { recent, remember } = useRecentUsers();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const gridRef = useRef<HTMLUListElement>(null);

  const profile = profileState.status === 'ready' ? profileState.profile : null;
  const repos = profile?.repos;

  // Only successful lookups are worth remembering.
  useEffect(() => {
    if (profile) remember(profile.user.login);
  }, [profile, remember]);

  /*
   * The spectrum, the activity strip, the dropdown options, and the star total
   * are all derived from the UNFILTERED repo list, so they describe the
   * account rather than the current view. That is what keeps the spectrum's
   * colours from repainting every time someone types in the filter box.
   */
  const spectrum = useMemo(() => buildSpectrum(repos ?? []), [repos]);
  const colorMap = useMemo(() => languageColorMap(spectrum), [spectrum]);
  const languages = useMemo(() => languageOptions(repos ?? []), [repos]);
  const topics = useMemo(() => topicOptions(repos ?? []), [repos]);
  const activity = useMemo(() => buildActivity(repos ?? []), [repos]);
  const stars = useMemo(() => totalStars(repos ?? []), [repos]);

  const visible = useMemo(
    () =>
      repos
        ? selectRepos(repos, {
            search: state.search,
            language: state.language,
            topic: state.topic,
            sort: state.sort,
            sourcesOnly: state.sourcesOnly,
          })
        : [],
    [repos, state.search, state.language, state.topic, state.sort, state.sourcesOnly],
  );

  // Any change to ordering or membership is a reorder pass. Including the
  // login means the baseline positions get recorded the moment data lands,
  // so the very first sort change already animates.
  useFlipReorder(
    gridRef,
    [profile?.user.login, state.sort, state.language, state.topic, state.search, state.sourcesOnly].join('|'),
  );

  // The bar scale is the biggest repo currently on screen, so the comparison
  // stays meaningful after filtering down to a handful of small projects.
  const maxStars = visible[0] ? Math.max(...visible.map((repo) => repo.stargazers_count)) : 0;

  const hasFilters = Boolean(state.search || state.language || state.topic || state.sourcesOnly);
  const clearFilters = useCallback(
    () => update({ search: '', language: null, topic: null, sourcesOnly: false }),
    [update],
  );

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
      />

      <main id="results" className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 sm:pt-6">
        {profileState.status === 'idle' && <IdleState onPick={setUsername} />}

        {profileState.status === 'loading' && <LoadingState />}

        {profileState.status === 'error' && (
          <ErrorState error={profileState.error} username={profileState.username} onRetry={retry} />
        )}

        {profile && (
          <>
            <ProfileCard
              profile={profile}
              spectrum={spectrum}
              activity={activity}
              totalStars={stars}
              activeLanguage={state.language}
              onSelectLanguage={(language) => update({ language })}
            />

            {profile.repos.length === 0 ? (
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
                  total={profile.repos.length}
                />

                {visible.length === 0 ? (
                  <NoMatchesState onClear={clearFilters} />
                ) : (
                  <ul ref={gridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((repo, index) => (
                      <li
                        key={repo.id}
                        // The lead card in the current ordering gets the lead
                        // cell, so the grid has a reading order instead of
                        // thirty identical boxes.
                        className={`h-full min-w-0 ${index === 0 ? 'sm:col-span-2' : ''}`}
                      >
                        <RepoCard
                          repo={repo}
                          figure={index + 1}
                          maxStars={maxStars}
                          principal={index === 0}
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
        sort={state.sort}
        sourcesOnly={state.sourcesOnly}
        theme={theme}
        hasFilters={hasFilters}
        onPickUser={setUsername}
        onSort={(sort) => update({ sort })}
        onToggleForks={() => update({ sourcesOnly: !state.sourcesOnly })}
        onToggleTheme={toggleTheme}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
