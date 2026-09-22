import type { GitHubRepo } from '../types';

export interface SpectrumSegment {
  label: string;
  count: number;
  /** 0–1, as a share of repos that have a primary language. */
  share: number;
  /** A CSS custom property name, so light/dark swap happens in the stylesheet. */
  color: string;
  isOther: boolean;
}

export interface Spectrum {
  segments: SpectrumSegment[];
  /** Repos with a primary language — the denominator for every share. */
  classified: number;
  total: number;
}

/**
 * Three named segments, then "Other".
 *
 * The cap is not cosmetic: the palette validator only clears the all-pairs
 * colour-vision gate for three hues at once. A fourth named segment would put
 * two colours on screen that some viewers cannot tell apart, so the tail folds
 * into a neutral grey instead.
 */
const NAMED_LIMIT = 3;
const SLOT_COLORS = ['var(--lang-1)', 'var(--lang-2)', 'var(--lang-3)'];
const OTHER_COLOR = 'var(--lang-other)';

/**
 * Colours are assigned by rank, which is normally an anti-pattern — filtering a
 * chart must never repaint the series a reader has already learned. It is safe
 * here because the spectrum is always computed from the *unfiltered* repo set:
 * it is a fixed portrait of the account, and searching or filtering the list
 * below never changes it. It only changes when you look up a different user,
 * which is a different dataset entirely.
 */
export function buildSpectrum(repos: GitHubRepo[]): Spectrum {
  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }

  const classified = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (classified === 0) {
    return { segments: [], classified: 0, total: repos.length };
  }

  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'),
  );

  const segments: SpectrumSegment[] = ranked
    .slice(0, NAMED_LIMIT)
    .map(([label, count], index) => ({
      label,
      count,
      share: count / classified,
      color: SLOT_COLORS[index] ?? OTHER_COLOR,
      isOther: false,
    }));

  const tail = ranked.slice(NAMED_LIMIT);
  if (tail.length > 0) {
    const count = tail.reduce((sum, [, n]) => sum + n, 0);
    segments.push({
      label: tail.length === 1 ? (tail[0]?.[0] ?? 'Other') : 'Other',
      count,
      share: count / classified,
      color: tail.length === 1 ? OTHER_COLOR : OTHER_COLOR,
      isOther: tail.length > 1,
    });
  }

  return { segments, classified, total: repos.length };
}

/**
 * The colour a repo's language chip should use, so a repo card and the spectrum
 * above it always agree. Languages outside the top three get the neutral grey —
 * the language name is always spelled out beside the dot, so nothing depends on
 * colour alone.
 */
export function languageColorMap(spectrum: Spectrum): Map<string, string> {
  const map = new Map<string, string>();
  for (const segment of spectrum.segments) {
    if (!segment.isOther) map.set(segment.label, segment.color);
  }
  return map;
}
