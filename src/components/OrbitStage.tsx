import { useRef } from 'react';
import type { RefObject } from 'react';
import { useHeroLoop } from '../hooks/useHeroLoop';
import { usePointerTilt } from '../hooks/usePointerTilt';
import { Cube } from './Cube';
import { OrbitPill } from './OrbitPill';
import type { OrbitPillData } from './OrbitPill';

interface Props {
  /** Up to six, in ranking order; null entries draw as skeletons. */
  pills: ReadonlyArray<OrbitPillData | null>;
  loading: boolean;
  reducedMotion: boolean;
  /** The hero section: its visibility runs the loop, its pointer tilts the cube. */
  heroRef: RefObject<HTMLElement | null>;
}

/**
 * The hero's centrepiece: a dashed axis, a glow, three orbit rings, the glass
 * cube, and six pills. Decorative — every fact the pills show is also in the
 * repository list — so the whole stage is hidden from assistive technology.
 */
export function OrbitStage({ pills, loading, reducedMotion, heroRef }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = useHeroLoop(heroRef, {
    pillCount: pills.length,
    restartKey: pills,
    hold: loading,
    reducedMotion,
  });
  usePointerTilt(heroRef, stageRef, !reducedMotion);

  const className = [
    'stage',
    frame.lit && 'is-lit',
    frame.mapped && 'is-mapped',
    frame.active && 'is-active',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={stageRef} className={className} aria-hidden="true">
      <div className="stage-axis" />
      <div className="stage-glow" />
      <div className="ring ring-1" />
      <div className="ring ring-2" />
      <div className="ring ring-3" />
      <div className="stage-tilt">
        <div className="stage-float">
          <Cube hero label="RepoBox" glyph="</>" />
        </div>
      </div>
      <div className="orbit-pills">
        {pills.map((pill, slot) => (
          <OrbitPill key={pill?.key ?? `skeleton-${slot}`} pill={pill} slot={slot} hot={frame.hot === slot} />
        ))}
      </div>
    </div>
  );
}
