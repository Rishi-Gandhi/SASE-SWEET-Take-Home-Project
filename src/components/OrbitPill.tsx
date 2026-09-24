import type { CSSProperties, ReactNode } from 'react';

export interface OrbitPillData {
  key: string;
  label: string;
  /** A secondary value, e.g. "★ 2.4k"; dropped on phones. */
  value?: string;
  icon: ReactNode;
}

interface Props {
  /** null draws a skeleton, while a profile loads. */
  pill: OrbitPillData | null;
  /** Which of the six orbit positions, and the pill's place in the cascade. */
  slot: number;
  hot: boolean;
}

export function OrbitPill({ pill, slot, hot }: Props) {
  const className = ['orbit-pill', hot && 'is-hot', !pill && 'is-skeleton'].filter(Boolean).join(' ');

  return (
    <span className={className} data-slot={slot} style={{ '--i': slot } as CSSProperties}>
      <span className="orbit-pill-icon">{pill?.icon}</span>
      {pill ? <span className="orbit-pill-label">{pill.label}</span> : <span className="orbit-pill-bar" />}
      {pill?.value && <span className="orbit-pill-value">{pill.value}</span>}
    </span>
  );
}
