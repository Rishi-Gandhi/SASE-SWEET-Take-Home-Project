import type { GitHubError } from '../lib/github';
import { timeUntil } from '../lib/format';
import { AlertIcon, DeckMark, SearchIcon } from './icons';

const SUGGESTIONS = ['torvalds', 'sindresorhus', 'gaearon', 'simonw', 'anthropics'];

/** First run: explain the app in one line and make it trivially easy to try. */
export function IdleState({ onPick }: { onPick: (username: string) => void }) {
  return (
    <div className="deck-rise flex flex-col items-center px-4 py-16 text-center sm:py-24">
      <DeckMark className="size-12 text-accent" />
      <h2 className="mt-5 max-w-xl font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Draw anyone&rsquo;s GitHub
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">
        Enter a username to see their public repositories — sorted, filtered, and weighed by the
        languages they actually build in.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <span className="label">Try</span>
        {SUGGESTIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="cursor-pointer rounded-[2px] border border-line px-3 py-1 font-mono text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`deck-skeleton rounded-[2px] ${className}`} />;
}

/**
 * Mirrors the real layout's geometry so the page does not jump when data lands.
 * `aria-busy` plus one polite status message means a screen reader hears
 * "loading" once, not a wall of placeholder boxes.
 */
export function LoadingState() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading repositories…
      </p>

      <section className="sheet bp-corners p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <SkeletonBlock className="size-20 shrink-0 rounded-[2px] sm:size-22" />
          <div className="flex-1 space-y-2.5">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-4 w-full max-w-md" />
            <SkeletonBlock className="h-3 w-40" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonBlock key={i} className="h-14 rounded-[2px]" />
          ))}
        </div>
        <SkeletonBlock className="mt-6 h-[10px] w-full rounded-[1px]" />
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonBlock key={i} className="h-[196px] rounded-[2px]" />
        ))}
      </div>
    </div>
  );
}

/** The account exists but has nothing public to show. */
export function NoReposState({ login }: { login: string }) {
  return (
    <div className="sheet bp-corners deck-rise flex flex-col items-center px-6 py-14 text-center">
      <DeckMark className="size-9 text-ink-3" />
      <h3 className="mt-4 font-display text-lg font-semibold">No public repositories</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-2">
        <span className="font-mono">@{login}</span> has a GitHub account, but nothing public to show
        yet.
      </p>
    </div>
  );
}

/** Repos exist, the current filters just do not match any of them. */
export function NoMatchesState({ onClear }: { onClear: () => void }) {
  return (
    <div className="sheet bp-corners deck-rise flex flex-col items-center px-6 py-14 text-center">
      <SearchIcon className="size-8 text-ink-3" />
      <h3 className="mt-4 font-display text-lg font-semibold">Nothing matches those filters</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-2">
        Every repository was filtered out. Widen the search or clear the filters to see them again.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 cursor-pointer rounded-[2px] border border-line px-3 py-1.5 font-mono text-sm text-ink-2 transition-colors hover:border-accent hover:text-accent"
      >
        Clear filters
      </button>
    </div>
  );
}

interface ErrorCopy {
  headline: string;
  body: string;
  retryable: boolean;
}

/**
 * Each failure mode gets its own wording. "Something went wrong" is useless —
 * a wrong username, an exhausted quota, and a dropped connection need three
 * different actions from the viewer.
 */
function describe(error: GitHubError, username: string): ErrorCopy {
  switch (error.kind) {
    case 'not-found':
      return {
        headline: `No GitHub user called “${username}”`,
        body: 'Check the spelling — GitHub usernames are the handle from the profile URL, not the display name.',
        retryable: false,
      };
    case 'invalid-username':
      return {
        headline: 'That is not a valid GitHub username',
        body: 'Usernames are up to 39 characters: letters, digits, and single hyphens between them.',
        retryable: false,
      };
    case 'rate-limit':
      return {
        headline: 'GitHub rate limit reached',
        body: `This app calls the GitHub API without a token, which allows 60 requests an hour per IP address. The quota refills ${
          error.resetAt ? timeUntil(error.resetAt) : 'within the hour'
        }.`,
        retryable: true,
      };
    case 'network':
      return {
        headline: 'Could not reach GitHub',
        body: 'The request never made it out. Check your connection and try again.',
        retryable: true,
      };
    default:
      return {
        headline: 'GitHub could not answer that request',
        body: error.message,
        retryable: true,
      };
  }
}

export function ErrorState({
  error,
  username,
  onRetry,
}: {
  error: GitHubError;
  username: string;
  onRetry: () => void;
}) {
  const copy = describe(error, username);

  return (
    <div
      role="alert"
      className="sheet bp-corners deck-rise flex flex-col items-center px-6 py-14 text-center"
      style={{ borderColor: 'color-mix(in oklab, var(--critical) 35%, transparent)' }}
    >
      <AlertIcon className="size-9 text-critical" />
      <h3 className="mt-4 font-display text-lg font-semibold">{copy.headline}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">{copy.body}</p>
      {copy.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 cursor-pointer rounded-[2px] bg-accent px-4 py-1.5 font-display text-sm font-semibold uppercase tracking-wider text-accent-ink transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      )}
    </div>
  );
}
