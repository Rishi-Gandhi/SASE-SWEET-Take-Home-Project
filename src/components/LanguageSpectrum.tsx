import type { Spectrum } from '../lib/spectrum';
import { exactNumber } from '../lib/format';

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

  return (
    <section aria-labelledby="spectrum-heading" className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id="spectrum-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3"
        >
          Language mix
        </h3>
        <p className="text-[11px] text-ink-3">
          {exactNumber(spectrum.classified)} of {exactNumber(spectrum.total)} repos classified
        </p>
      </div>

      {/* 24px tall so the hit target clears the minimum; the 10px fill sits
          centred inside it. A 2px gap separates segments instead of a border. */}
      <div className="mt-2 flex h-6 w-full items-center gap-[2px]">
        {spectrum.segments.map((segment) => {
          const isActive = !segment.isOther && activeLanguage === segment.label;
          const noun = segment.count === 1 ? 'repo' : 'repos';
          const label = `${segment.label}: ${exactNumber(segment.count)} ${noun}, ${percent(segment.share)}`;

          const fill = (
            <span
              className="block h-[10px] w-full rounded-[3px] transition-[height,opacity] duration-200 group-hover:h-[14px]"
              style={{
                background: segment.color,
                opacity: activeLanguage && !isActive && !segment.isOther ? 0.4 : 1,
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
              className="group flex h-full cursor-pointer items-center rounded-[4px]"
              style={{ flex: `${segment.share} 1 0`, minWidth: '6px' }}
            >
              {fill}
            </button>
          );
        })}
      </div>

      {/* Every segment is also named here, so identity never rests on colour
          alone and the values stay readable without hovering anything. */}
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {spectrum.segments.map((segment) => {
          const isActive = !segment.isOther && activeLanguage === segment.label;
          const content = (
            <>
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: segment.color }}
              />
              <span className="text-ink-2">{segment.label}</span>
              <span className="font-mono text-[11px] text-ink-3 tabular-nums">
                {percent(segment.share)}
              </span>
            </>
          );

          return (
            <li key={`legend-${segment.label}`} className="text-xs">
              {segment.isOther ? (
                <span className="flex items-center gap-1.5">{content}</span>
              ) : (
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectLanguage(isActive ? null : segment.label)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-inset ${
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
