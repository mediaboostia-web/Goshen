import type { SVGProps } from 'react';

/**
 * The Goshen mark — an open "G": the arc is the covenant/community, the
 * break on the right is the flow (money coming in, tracked, going out
 * reconciled). Butt-cap, 90° cuts, no rounding — per Charte graphique v1.0
 * p.03 ("la rigueur du tracé porte la promesse de rigueur comptable").
 * Stroke follows `currentColor` — set the color via a text-* className.
 */
export function GoshenLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth={12} {...props}>
      <g strokeLinecap="butt">
        <path d="M96.4 39 A42 42 0 1 0 96.4 81" />
        <path d="M102 60 L66 60" />
      </g>
    </svg>
  );
}
