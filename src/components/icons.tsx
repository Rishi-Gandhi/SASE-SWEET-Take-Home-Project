interface IconProps {
  className?: string;
}

const base = 'shrink-0';

export function StarIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${base} ${className}`} fill="currentColor">
      <path d="M8 1.2l2.03 4.12 4.55.66-3.29 3.2.78 4.53L8 11.57l-4.07 2.14.78-4.53-3.29-3.2 4.55-.66L8 1.2z" />
    </svg>
  );
}

export function SearchIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    >
      <circle cx="7.2" cy="7.2" r="4.6" />
      <path d="M10.6 10.6L14 14" />
    </svg>
  );
}

export function ArrowOutIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 10.5L10.5 5.5M6.2 5.5h4.3v4.3" />
    </svg>
  );
}

export function AlertIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.6v5M12 16.2h.01" />
    </svg>
  );
}

export function PinIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M8 1.8l2.2 2.2v3.1l1.9 1.9H3.9l1.9-1.9V4z" />
      <path d="M8 9v5.2" />
    </svg>
  );
}

function Stroke({ className = '', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** A closed book: GitHub's shorthand for a repository. */
export function BookIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M3 2.5h8.5v11H3.8a.8.8 0 01-.8-.8z" />
      <path d="M3 11.2c0-.6.4-1 1-1h7.5" />
    </Stroke>
  );
}

export function SortIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 3v10M2.6 10.6L5 13l2.4-2.4M11 13V3M8.6 5.4L11 3l2.4 2.4" />
    </Stroke>
  );
}

export function FilterIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M2.5 3.5h11l-4 5v4l-3 1.5V8.5z" />
    </Stroke>
  );
}

export function CodeIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5M9 3L7 13" />
    </Stroke>
  );
}

export function ChevronLeftIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M10 3L5 8l5 5" />
    </Stroke>
  );
}

export function ChevronRightIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M6 3l5 5-5 5" />
    </Stroke>
  );
}

export function PauseIcon({ className = '' }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5.5 3.5v9M10.5 3.5v9" />
    </Stroke>
  );
}

export function PlayIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${base} ${className}`} fill="currentColor">
      <path d="M5 3.2v9.6L12.5 8z" />
    </svg>
  );
}
