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

export function ForkIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="4" cy="3.2" r="1.8" />
      <circle cx="12" cy="3.2" r="1.8" />
      <circle cx="8" cy="12.8" r="1.8" />
      <path d="M4 5v1.4A2.6 2.6 0 006.6 9h2.8A2.6 2.6 0 0012 6.4V5M8 9v2" />
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

export function SunIcon({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1.4v1.5M8 13.1v1.5M14.6 8h-1.5M2.9 8H1.4M12.7 3.3l-1 1M4.3 11.7l-1 1M12.7 12.7l-1-1M4.3 4.3l-1-1" />
    </svg>
  );
}

export function MoonIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${base} ${className}`} fill="currentColor">
      <path d="M13.2 9.6A5.6 5.6 0 016.4 2.8a5.8 5.8 0 106.8 6.8z" />
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

export function DeckMark({ className = '' }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={`${base} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
    >
      <path d="M16 4l10 6v12l-10 6-10-6V10z" />
      <path d="M16 11l5 3v6l-5 3-5-3v-6z" opacity="0.55" />
    </svg>
  );
}
