import type { GitHubRepo } from '../types';

export interface SpectrumSegment {
  label: string;
  count: number;
  /** 0–1, as a share of repos that have a primary language. */
  share: number;
  isOther: boolean;
}

export interface Spectrum {
  segments: SpectrumSegment[];
  /** Repos with a primary language — the denominator for every share. */
  classified: number;
  total: number;
}

/**
 * Three named segments, then "Other". Past three, segments get too thin to
 * click or label at phone width, so the long tail folds into one neutral
 * segment. Colours are no longer this module's business: each language is
 * drawn in its GitHub colour by name (lib/languages), which is also why the
 * rank order here can never repaint anything.
 */
const NAMED_LIMIT = 3;

/**
 * The account's language mix, most-used first. Always built from the
 * unfiltered repositories: it is a portrait of the account, so filtering the
 * list below it never changes it.
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
    .map(([label, count]) => ({
      label,
      count,
      share: count / classified,
      isOther: false,
    }));

  const tail = ranked.slice(NAMED_LIMIT);
  if (tail.length > 0) {
    const count = tail.reduce((sum, [, n]) => sum + n, 0);
    segments.push({
      label: tail.length === 1 ? (tail[0]?.[0] ?? 'Other') : 'Other',
      count,
      share: count / classified,
      isOther: tail.length > 1,
    });
  }

  return { segments, classified, total: repos.length };
}
