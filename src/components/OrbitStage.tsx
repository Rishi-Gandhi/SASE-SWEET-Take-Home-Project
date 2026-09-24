import { useEffect, useRef, useState } from 'react';
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
  /** Increments whenever the cube should shake: a handle that cannot exist. */
  shakeKey: number;
  reducedMotion: boolean;
  /** Whether the hero is on screen; the loop only runs while it is. */
  onScreen: boolean;
  /** The hero section, whose pointer tilts the cube. */
  heroRef: RefObject<HTMLElement | null>;
}

/**
 * The hero's centrepiece: a dashed axis, a glow, three orbit rings, the glass
 * cube, and six pills. Decorative — every fact the pills show is also in the
 * repository list — so the whole stage is hidden from assistive technology.
 */
export function OrbitStage({ pills, loading, shakeKey, reducedMotion, onScreen, heroRef }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = useHeroLoop({
    onScreen,
    pillCount: pills.length,
    restartKey: pills,
    hold: loading,
    reducedMotion,
  });
  usePointerTilt(heroRef, stageRef, !reducedMotion);

  /*
   * While a profile loads the rings spin four times faster. Changing a CSS
   * animation's duration mid-spin recomputes its progress against the new
   * duration and snaps every ring to a different angle, so the rate is changed
   * on the running animations instead: same angle, new speed.
   */
  useEffect(() => {
    const rings = stageRef.current?.querySelectorAll<HTMLElement>('.ring') ?? [];
    for (const ring of rings) {
      // getAnimations is missing from jsdom and older browsers; the rings
      // then simply keep their normal speed.
      for (const animation of ring.getAnimations?.() ?? []) {
        animation.updatePlaybackRate(loading ? 4 : 1);
      }
    }
  }, [loading]);

  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (shakeKey > 0 && !reducedMotion) setShaking(true);
  }, [shakeKey, reducedMotion]);

  const className = [
    'stage',
    frame.lit && 'is-lit',
    frame.mapped && 'is-mapped',
    frame.active && 'is-active',
    loading && 'is-loading',
    shaking && 'is-shaking',
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
      <div
        className="stage-tilt"
        onAnimationEnd={(event) => {
          if (event.animationName === 'cube-shake') setShaking(false);
        }}
      >
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
