import { GoshenLogo } from './GoshenLogo';

const INK = '#0F172A';
const CREME = '#F4F4F0';
const LINE_ON_LIGHT = '#D6D6CB';
const LINE_ON_DARK = '#4A5670';

interface GoshenWordmarkProps {
  /** 'ink' for light backgrounds, 'creme' for dark/navy backgrounds. */
  variant?: 'ink' | 'creme';
  /** Official tagline slot — omit on compact/utility screens. */
  tagline?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}

// The approved horizontal lockup (Charte Goshen-selection.png / goshen-horizontal[.creme].svg):
// bare mark, thin rule, "Goshen" wordmark — same ink color for both, no icon tile.
export function GoshenWordmark({
  variant = 'ink',
  tagline,
  markClassName = 'h-7 w-7',
  wordmarkClassName = 'text-xl',
}: GoshenWordmarkProps) {
  const ink = variant === 'ink' ? INK : CREME;
  const line = variant === 'ink' ? LINE_ON_LIGHT : LINE_ON_DARK;

  return (
    <span className="inline-flex items-center gap-3">
      <GoshenLogo className={`shrink-0 ${markClassName}`} style={{ color: ink }} />
      <span className="self-stretch w-px" style={{ backgroundColor: line }} />
      <span className="flex flex-col justify-center">
        <span
          className={`font-serif font-extrabold tracking-tight ${wordmarkClassName}`}
          style={{ color: ink }}
        >
          Goshen
        </span>
        {tagline && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
