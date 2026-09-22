import type { Profile } from '../types';
import type { Spectrum } from '../lib/spectrum';
import { absoluteDate, compactNumber, exactNumber } from '../lib/format';
import { LanguageSpectrum } from './LanguageSpectrum';
import { ArrowOutIcon } from './icons';

interface Props {
  profile: Profile;
  spectrum: Spectrum;
  totalStars: number;
  activeLanguage: string | null;
  onSelectLanguage: (language: string | null) => void;
}

/**
 * Stat tiles, not a chart: four headline numbers with no comparison to make.
 * Proportional figures here — `tabular-nums` is reserved for the repo rows,
 * where counts actually align vertically.
 */
function StatTile({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded-xl border border-line bg-inset px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold text-ink" title={title}>
        {value}
      </dd>
    </div>
  );
}

export function ProfileCard({
  profile,
  spectrum,
  totalStars,
  activeLanguage,
  onSelectLanguage,
}: Props) {
  const { user, repos, truncated } = profile;

  return (
    <section className="card deck-rise p-5 sm:p-6" aria-labelledby="profile-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <img
          src={user.avatar_url}
          alt=""
          width={88}
          height={88}
          className="size-20 shrink-0 rounded-2xl border border-line object-cover sm:size-22"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="profile-heading" className="truncate text-2xl font-semibold tracking-tight">
              {user.name ?? user.login}
            </h2>
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 rounded-md font-mono text-sm text-accent hover:underline"
            >
              @{user.login}
              <ArrowOutIcon className="size-3.5" />
            </a>
          </div>

          {user.bio && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{user.bio}</p>}

          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
            {user.company && <li>{user.company}</li>}
            {user.location && <li>{user.location}</li>}
            {user.blog && (
              <li>
                <a
                  href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent hover:underline"
                >
                  {user.blog.replace(/^https?:\/\//, '')}
                </a>
              </li>
            )}
            <li>Joined {absoluteDate(user.created_at)}</li>
          </ul>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile label="Repos" value={exactNumber(user.public_repos)} />
        <StatTile
          label="Stars"
          value={compactNumber(totalStars)}
          title={`${exactNumber(totalStars)} stars across the ${exactNumber(repos.length)} repos loaded`}
        />
        <StatTile label="Followers" value={compactNumber(user.followers)} />
        <StatTile label="Following" value={compactNumber(user.following)} />
      </dl>

      {truncated && (
        <p className="mt-3 text-xs text-ink-3">
          Showing the {exactNumber(repos.length)} most recently updated repositories. This account has
          more than we load in one go.
        </p>
      )}

      <LanguageSpectrum
        spectrum={spectrum}
        activeLanguage={activeLanguage}
        onSelectLanguage={onSelectLanguage}
      />
    </section>
  );
}
