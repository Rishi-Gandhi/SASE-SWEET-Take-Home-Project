import type { Spectrum } from '../lib/spectrum';

export interface CondensedProfile {
  login: string;
  avatarUrl: string;
  repoCount: number;
  spectrum: Spectrum;
}

interface Props {
  /** The section in view, for the breadcrumb. */
  crumb: string;
  /** Shown only once the profile header has scrolled out of view. */
  condensed: CondensedProfile | null;
  onOpenPalette: () => void;
}

/**
 * Three columns: the brand, a label that becomes the account's identity once
 * its header scrolls away, and a breadcrumb that follows the section in view.
 * The search itself lives in the hero now.
 */
export function TopBar({ crumb, condensed, onOpenPalette }: Props) {
  return (
    <header className={`topbar ${condensed ? 'is-condensed' : ''}`}>
      <a href="./" className="topbar-brand label" aria-label="RepoBox home">
        <span className="brand-glyph" aria-hidden="true" />
        RepoBox
      </a>

      <div className="topbar-mid">
        {condensed ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={condensed.avatarUrl}
              alt=""
              width={20}
              height={20}
              className="size-5 shrink-0 rounded-[5px] border border-panel-line object-cover"
            />
            <span className="label truncate">@{condensed.login}</span>
            <span className="label shrink-0 text-muted">{condensed.repoCount} shown</span>

            {/* The account's language mix at strip height, so its shape stays
                on screen while you read its repositories. */}
            {condensed.spectrum.segments.length > 0 && (
              <div
                className="hidden h-1.5 w-28 shrink-0 items-stretch gap-[2px] sm:flex"
                role="img"
                aria-label={`Language mix: ${condensed.spectrum.segments
                  .map((segment) => `${segment.label} ${Math.round(segment.share * 100)}%`)
                  .join(', ')}`}
              >
                {condensed.spectrum.segments.map((segment) => (
                  <span
                    key={segment.label}
                    className="rounded-full"
                    style={{ background: segment.color, flex: `${segment.share} 1 0` }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="label">
            Repo explorer<em>Public GitHub repositories</em>
          </p>
        )}
      </div>

      <div className="topbar-end">
        {/* Decorative: it restates the section headings a screen reader
            already announces. */}
        <p className="label topbar-crumb" aria-hidden="true">
          Home / <b>{crumb}</b>
        </p>
        <button type="button" onClick={onOpenPalette} className="kbd-btn" aria-label="Open command palette">
          <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
