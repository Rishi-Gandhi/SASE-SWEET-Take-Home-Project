/** 1234 -> "1.2k", 203118 -> "203k". Keeps star counts from wrapping on mobile. */
export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function exactNumber(value: number): string {
  return new Intl.NumberFormat('en').format(value);
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

/** "2 days ago" — Intl does the pluralisation and the wording. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const elapsed = then - now.getTime();

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return formatter.format(Math.round(elapsed / ms), unit);
    }
  }
  return 'just now';
}

export function absoluteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

/** "in 42 minutes" for the rate-limit reset, clamped so it never reads negative. */
export function timeUntil(target: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  if (minutes < 1) return 'any moment now';
  if (minutes === 1) return 'in about a minute';
  if (minutes < 60) return `in about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? 'in about an hour' : `in about ${hours} hours`;
}
