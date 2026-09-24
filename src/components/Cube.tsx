import type { CSSProperties } from 'react';

/** Back to front, so the front face paints last wherever 3D sorting ties. */
const FACES = ['back', 'right', 'bottom', 'left', 'top', 'front'] as const;

interface Props {
  /** Edge length, any CSS length. Omit to inherit --s from the surrounding CSS. */
  size?: string;
  /** Text on the front face. */
  label?: string;
  /** Glyph on the top face. */
  glyph?: string;
  /** The hero's glass cube: an inner core light, and lit/unlit states. */
  hero?: boolean;
  /** Solid accent faces, for the "active" cubes in the steps and towers. */
  accent?: boolean;
  /** A true isometric view: tipped 35.26° forward, turned 45°. */
  iso?: boolean;
}

/**
 * A real CSS 3D cube — no canvas, no WebGL. Six faces, each rotated to its
 * side and pushed out from the centre by half the edge length. Purely
 * decorative wherever it appears, so it is hidden from assistive technology.
 */
export function Cube({ size, label, glyph, hero = false, accent = false, iso = false }: Props) {
  const className = ['cube', hero && 'cube-hero', accent && 'is-accent', iso && 'is-iso']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={size ? ({ '--s': size } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      {FACES.map((face) => (
        <span key={face} className={`cube-face f-${face}`} />
      ))}
      {label && <span className="cube-label">{label}</span>}
      {glyph && <span className="cube-glyph">{glyph}</span>}
    </div>
  );
}
