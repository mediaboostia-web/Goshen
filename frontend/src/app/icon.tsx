import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Charte graphique p.04 — "Icône d'application": solid night-blue square,
// no internal margin, mark stroke widened to 16 units under 32px.
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
      }}
    >
      <svg width="23" height="23" viewBox="0 0 120 120" fill="none">
        <g stroke="#0D9488" strokeWidth={16} strokeLinecap="butt">
          <path d="M96.4 39 A42 42 0 1 0 96.4 81" />
          <path d="M102 60 L66 60" />
        </g>
      </svg>
    </div>,
    { ...size },
  );
}
