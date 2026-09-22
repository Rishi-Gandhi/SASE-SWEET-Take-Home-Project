import { useMemo } from 'react';
import { TopBar } from './components/TopBar';
import { ProfileCard } from './components/ProfileCard';
import { FilterBar } from './components/FilterBar';
import { RepoCard } from './components/RepoCard';
import { ErrorState, IdleState, LoadingState, NoMatchesState, NoReposState } from './components/states';
import { useDeckState } from './hooks/useDeckState';
import { useProfile } from './hooks/useProfile';
import { useTheme } from './hooks/useTheme';
import { languageOptions, selectRepos, totalStars } from './lib/repos';
import { buildSpectrum, languageColorMap } from './lib/spectrum';

export default function App() {
  const { state, update, setUsername } = useDeckState();
  const { state: profileState, retry } = useProfile(state.username);
  const { theme, toggleTheme } = useTheme();

  const profile = profileState.status === 'ready' ? profileState.profile : null;
  const repos = profile?.repos;

  /*
   * The spectrum, the language dropdown, and the star total are all derived from
   * the UNFILTERED repo list, so they describe the account rather than the
   * current view. That is what keeps the spectrum's colours from repainting
   * every time someone types in the filter box.
   */
  const spectrum = useMemo(() => buildSpectrum(repos ?? []), [repos]);
  const colorMap = useMemo(() => languageColorMap(spectrum), [spectrum]);
  const languages = useMemo(() => languageOptions(repos ?? []), [repos]);
  const stars = useMemo(() => totalStars(repos ?? []), [repos]);

  const visible = useMemo(
    () =>
      repos
        ? selectRepos(repos, {
            search: state.search,
            language: state.language,
            sort: state.sort,
            sourcesOnly: state.sourcesOnly,
          })
        : [],
    [repos, state.search, state.language, state.sort, state.sourcesOnly],
  );

  // The bar scale is the biggest repo currently on screen, so the comparison
  // stays meaningful after filtering down to a handful of small projects.
  const maxStars = visible[0] ? Math.max(...visible.map((repo) => repo.stargazers_count)) : 0;

  const clearFilters = () => update({ search: '', language: null, sourcesOnly: false });

  return (
    <div className="min-h-dvh">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-accent-ink"
      >
        Skip to results
      </a>

      <TopBar
        username={state.username}
        onSubmit={setUsername}
        theme={theme}
        onToggleTheme={toggleTheme}
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
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((repo) => (
                      <li key={repo.id} className="h-full min-w-0">
                        <RepoCard
                          repo={repo}
                          maxStars={maxStars}
                          languageColor={
                            (repo.language && colorMap.get(repo.language)) || 'var(--lang-other)'
                          }
                          isLanguageActive={state.language !== null && state.language === repo.language}
                          onSelectLanguage={(language) => update({ language })}
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-ink-3 sm:px-6">
          <p>
            Data from the{' '}
            <a
              href="https://docs.github.com/en/rest/repos/repos"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent hover:underline"
            >
              GitHub REST API
            </a>
            , unauthenticated — 60 requests an hour.
          </p>
          <p>Press ⌘K to search.</p>
        </div>
      </footer>
    </div>
  );
}
