import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
      <svg width="128" height="128" viewBox="0 0 120 120" fill="none">
        <g stroke="#0D9488" strokeWidth={14} strokeLinecap="butt">
          <path d="M96.4 39 A42 42 0 1 0 96.4 81" />
          <path d="M102 60 L66 60" />
        </g>
      </svg>
    </div>,
    { ...size },
  );
}
