import type { CSSProperties } from 'react';
import { towerHeight } from '../lib/highlights';
import { compactNumber } from '../lib/format';
import { Cube } from './Cube';
import { StarIcon } from './icons';

/**
 * A repository's stars as a stack of one to four isometric cubes on a floor
 * grid, the top one in the accent. The drawing is decoration; the star count
 * in its corner is the fact, so only that is exposed to assistive technology.
 */
export function IsoTower({ stars, maxStars }: { stars: number; maxStars: number }) {
  const height = towerHeight(stars, maxStars);

  return (
    <div className="iso">
      <div className="iso-floor" aria-hidden="true" />
      {Array.from({ length: height }, (_, level) => (
        <div
          key={level}
          className="iso-cube"
          style={{ '--j': level } as CSSProperties}
          aria-hidden="true"
        >
          <Cube iso accent={level === height - 1} />
        </div>
      ))}
      <span className="iso-stars">
        <StarIcon />
        {compactNumber(stars)}
        <span className="sr-only"> stars</span>
      </span>
    </div>
  );
}
