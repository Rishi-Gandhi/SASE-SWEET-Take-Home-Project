import { Cube } from './Cube';

/**
 * The hero's centrepiece: a dashed axis, a glow, three orbit rings and the
 * glass cube, all stacked in one grid cell. Decorative — every fact it shows
 * is also in the repository list — so the whole stage is hidden from
 * assistive technology.
 */
export function OrbitStage() {
  return (
    <div className="stage is-lit" aria-hidden="true">
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
    </div>
  );
}
