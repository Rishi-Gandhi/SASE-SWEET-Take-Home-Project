import type { Spectrum } from '../lib/spectrum';
import { exactNumber } from '../lib/format';
import { UNKNOWN_LANGUAGE_COLOR, languageColor } from '../lib/languages';

interface Props {
  spectrum: Spectrum;
  activeLanguage: string | null;
  onSelectLanguage: (language: string | null) => void;
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * Part-to-whole, so this is a horizontal stacked bar rather than a donut: a ring
 * makes close values genuinely hard to compare, and language names are long
 * enough that a horizontal form labels far more cleanly.
 *
 * The bar doubles as a filter — clicking a segment scopes the list below — which
 * is why each segment is a real button rather than a div with a tooltip.
 */
export function LanguageSpectrum({ spectrum, activeLanguage, onSelectLanguage }: Props) {
  if (spectrum.segments.length === 0) return null;

  const colorOf = (segment: Spectrum['segments'][number]) =>
    segment.isOther ? UNKNOWN_LANGUAGE_COLOR : languageColor(segment.label);

  return (
    <section aria-labelledby="spectrum-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id="spectrum-heading" className="label">
          Language mix
        </h3>
        <p className="label text-muted">
          {exactNumber(spectrum.classified)} of {exactNumber(spectrum.total)} classified
        </p>
      </div>

      {/* 24px tall so the hit target clears the minimum; the 8px fill sits
          centred inside it. A 2px gap separates segments instead of a border. */}
      <div className="mt-2.5 flex h-6 w-full items-center gap-[2px]">
        {spectrum.segments.map((segment) => {
          const isActive = !segment.isOther && activeLanguage === segment.label;
          const noun = segment.count === 1 ? 'repo' : 'repos';
          const label = `${segment.label}: ${exactNumber(segment.count)} ${noun}, ${percent(segment.share)}`;

          const fill = (
            <span
              className="block h-2 w-full rounded-full transition-[height,opacity] duration-200 group-hover:h-3"
              style={{
                background: colorOf(segment),
                opacity: activeLanguage && !isActive && !segment.isOther ? 0.35 : 1,
              }}
            />
          );

          if (segment.isOther) {
            return (
              <span
                key={segment.label}
                title={label}
                className="flex h-full items-center"
                style={{ flex: `${segment.share} 1 0`, minWidth: '6px' }}
              >
                {fill}
              </span>
            );
          }

          return (
            <button
              key={segment.label}
              type="button"
              title={label}
              aria-pressed={isActive}
              aria-label={`${label}. Filter by ${segment.label}`}
              onClick={() => onSelectLanguage(isActive ? null : segment.label)}
              className="group flex h-full cursor-pointer items-center rounded-full"
              style={{ flex: `${segment.share} 1 0`, minWidth: '6px' }}
            >
              {fill}
            </button>
          );
        })}
      </div>

      {/* Every segment is also named here, so identity never rests on colour
          alone and the values stay readable without hovering anything. */}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {spectrum.segments.map((segment) => {
          const isActive = !segment.isOther && activeLanguage === segment.label;
          const content = (
            <>
              <span className="lang-dot" style={{ background: colorOf(segment) }} aria-hidden="true" />
              <span className="text-fg">{segment.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-muted">{percent(segment.share)}</span>
            </>
          );

          return (
            <li key={`legend-${segment.label}`} className="text-[13px]">
              {segment.isOther ? (
                <span className="flex min-h-8 items-center gap-2">{content}</span>
              ) : (
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectLanguage(isActive ? null : segment.label)}
                  className={`-mx-2 flex min-h-8 cursor-pointer items-center gap-2 rounded-full px-2 transition-colors hover:bg-white/5 ${
                    isActive ? 'bg-accent-soft' : ''
                  }`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
