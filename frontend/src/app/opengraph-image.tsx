import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

// File-based OG image: inherited by every route (no page overrides the
// `openGraph` key), so a link to /soutenir or /confidentialite shares the
// same branded card. Replaces the old /photos/dashboard-preview.png, which
// was declared as 1200x630 in layout.tsx but is actually 1365x767 — the
// mismatch let scrapers letterbox or crop the card unpredictably.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Goshen — Logiciel gratuit de gestion financière pour églises';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: '#0F172A',
        color: '#F4F4F0',
      }}
    >
      {/* Brand lockup — the same mark as icon.tsx, drawn inline so the
            card needs no network fetch at generation time. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
          <g stroke="#0D9488" strokeWidth={14} strokeLinecap="butt">
            <path d="M96.4 39 A42 42 0 1 0 96.4 81" />
            <path d="M102 60 L66 60" />
          </g>
        </svg>
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.02em' }}>Goshen</div>
      </div>

      <div
        style={{
          marginTop: '48px',
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: '900px',
        }}
      >
        La gestion financière simple de votre église
      </div>

      <div style={{ marginTop: '32px', fontSize: 30, color: '#A7BCC4', maxWidth: '880px' }}>
        Dîmes, offrandes et dépenses en temps réel — multi-annexes, rapports PDF, hors connexion.
      </div>

      <div
        style={{
          marginTop: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: 26,
          color: '#0D9488',
          fontWeight: 700,
        }}
      >
        <span>100 % gratuit</span>
        <span style={{ color: '#3A4A63' }}>•</span>
        <span>{SITE_NAME}</span>
      </div>
    </div>,
    { ...size },
  );
}
