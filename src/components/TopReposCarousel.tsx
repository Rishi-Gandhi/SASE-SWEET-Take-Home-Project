import { useMemo, useRef } from 'react';
import type { GitHubRepo } from '../types';
import { useCarousel } from '../hooks/useCarousel';
import { topRepos } from '../lib/highlights';
import { languageColor } from '../lib/languages';
import { IsoTower } from './IsoTower';
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from './icons';

const CARD_COUNT = 4;

/**
 * The account's most-starred repositories, one card at a time, full-bleed.
 * Always the primary account's unfiltered set, so filtering the list below
 * never reshuffles it. Mounted with the account's login as its key, so a new
 * account starts again from the first card.
 */
export function TopReposCarousel({ repos, reducedMotion }: { repos: GitHubRepo[]; reducedMotion: boolean }) {
  const top = useMemo(() => topRepos(repos, CARD_COUNT), [repos]);
  const trackRef = useRef<HTMLDivElement>(null);
  const { active, prev, next, onKeyDown, autoplay, toggleAutoplay } = useCarousel(trackRef, {
    count: top.length,
    reducedMotion,
  });

  const maxStars = top[0]?.stargazers_count ?? 0;

  return (
    <section className="mt-10" aria-labelledby="top-heading">
      <div className="sec-h">
        <div>
          <p className="label">Most starred</p>
          <h3 id="top-heading" className="sec-title">
            Top repositories
          </h3>
        </div>

        {top.length > 1 && (
          <div className="flex shrink-0 gap-2">
            {!reducedMotion && (
              <button
                type="button"
                className="round-btn"
                onClick={toggleAutoplay}
                aria-label={autoplay ? 'Pause auto-advance' : 'Resume auto-advance'}
              >
                {autoplay ? <PauseIcon /> : <PlayIcon />}
              </button>
            )}
            <button type="button" className="round-btn" onClick={prev} aria-label="Previous repository">
              <ChevronLeftIcon />
            </button>
            <button type="button" className="round-btn" onClick={next} aria-label="Next repository">
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Focusable so the arrow keys work on it; the slides scroll and snap
          natively, so drag and swipe need no code at all. */}
      <div
        ref={trackRef}
        className="carousel-track"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-labelledby="top-heading"
        onKeyDown={onKeyDown}
      >
        {top.map((repo, index) => (
          <div
            key={repo.id}
            data-slide
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${top.length}: ${repo.name}`}
            className={`carousel-card ${index === active ? 'is-active' : ''}`}
          >
            <p className="label text-muted">
              #{index + 1}
              {repo.language && ` · ${repo.language}`}
            </p>
            <h4 className="carousel-name">{repo.name}</h4>
            <p className={`carousel-desc ${repo.description ? '' : 'is-empty'}`}>
              {repo.description ?? 'No description provided.'}
            </p>

            <IsoTower stars={repo.stargazers_count} maxStars={maxStars} />

            <div className="carousel-foot">
              {repo.language ? (
                <span className="lang">
                  <span
                    className="lang-dot"
                    style={{ background: languageColor(repo.language) }}
                    aria-hidden="true"
                  />
                  {repo.language}
                </span>
              ) : (
                <span />
              )}
              <a className="gh-link" href={repo.html_url} target="_blank" rel="noopener noreferrer">
                Open on GitHub<span className="sr-only">: {repo.name}</span> <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
