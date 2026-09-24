import type { GitHubError } from '../lib/github';
import { timeUntil } from '../lib/format';
import { Cube } from './Cube';
import { AlertIcon } from './icons';

const clock = new Intl.DateTimeFormat('en', { timeStyle: 'short' });

/**
 * Before any search. The hero above holds the field and the suggestions; this
 * only says where the results will appear, and gets the viewer back up there.
 */
export function ReposIdle({ onStart }: { onStart: () => void }) {
  return (
    <div className="empty-panel enter">
      <p className="label">
        Nothing opened yet<em>Repositories appear here</em>
      </p>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Search a GitHub username above to open its box: every public repository, sortable and
        filterable.
      </p>
      <button type="button" onClick={onStart} className="chip mt-5">
        Search a username
      </button>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton rounded-full ${className}`} />;
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

      <div className="profile">
        <div className="profile-head">
          <div className="skeleton size-16 shrink-0 rounded-card" />
          <div className="flex-1 space-y-3 pt-1">
            <SkeletonBlock className="h-7 w-56" />
            <SkeletonBlock className="h-3.5 w-full max-w-md" />
            <SkeletonBlock className="h-3 w-40" />
          </div>
        </div>
      </div>

      <div className="repo-grid mt-10">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="repo-card" aria-hidden="true">
            <div className="flex justify-between gap-4">
              <SkeletonBlock className="h-4 w-2/5" />
              <SkeletonBlock className="h-4 w-12" />
            </div>
            <SkeletonBlock className="h-3 w-4/5" />
            <SkeletonBlock className="h-3 w-3/5" />
            <div className="mt-auto flex justify-between gap-4 pt-6">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The account exists but has nothing public to show. */
export function NoReposState({ login }: { login: string }) {
  return (
    <div className="empty-panel enter">
      <div className="empty-cube" aria-hidden="true">
        <Cube iso size="34px" />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">No public repositories</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        @{login} has a GitHub account, but nothing public to show yet.
      </p>
    </div>
  );
}

/**
 * Says which filters emptied the list, in their own words, so the way out is
 * obvious: `No repositories match "zz" in Rust.`
 */
function noMatchMessage({
  search,
  language,
  topic,
  sourcesOnly,
}: {
  search: string;
  language: string | null;
  topic: string | null;
  sourcesOnly: boolean;
}): string {
  const query = search.trim();
  const scope = [language && `in ${language}`, topic && `tagged ${topic}`].filter(Boolean).join(' ');
  const forks = sourcesOnly ? ' once forks are hidden' : '';
  if (query) return `No repositories match “${query}”${scope ? ` ${scope}` : ''}${forks}.`;
  if (scope) return `No repositories ${scope}${forks}.`;
  return `No repositories left${forks}.`;
}

/** Repos exist, the current filters just do not match any of them. */
export function NoMatchesState(props: {
  search: string;
  language: string | null;
  topic: string | null;
  sourcesOnly: boolean;
  onClear: () => void;
}) {
  return (
    <div className="empty-panel is-dashed enter">
      <p className="text-[15px] text-fg">{noMatchMessage(props)}</p>
      <button type="button" onClick={props.onClear} className="chip mt-4">
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
          error.resetAt ? `${timeUntil(error.resetAt)}, at ${clock.format(error.resetAt)}` : 'within the hour'
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
    <div role="alert" className="empty-panel is-error enter">
      <AlertIcon className="size-8 text-critical" />
      <h3 className="mt-4 font-display text-lg font-semibold">{copy.headline}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{copy.body}</p>
      {copy.retryable && (
        <button type="button" onClick={onRetry} className="btn-primary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}
