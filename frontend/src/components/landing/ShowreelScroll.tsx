'use client';

import { useEffect, useRef, useState } from 'react';

// Showreel placed right under the hero. The video frame starts tilted back
// (rotateX, like a screen lying on a desk) and straightens up to face the
// visitor as the section scrolls into view. Progress is read from the
// section's position on each animation frame and written straight to the
// DOM through a CSS variable — no React state per scroll tick, so the
// scroll stays smooth on low-end phones. prefers-reduced-motion gets the
// flat frame with no scroll effect.
const MAX_TILT_DEG = 26;

export function ShowreelScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame.style.setProperty('--p', '1');
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the section top touches the bottom of the viewport,
      // 1 once it has travelled ~65% of the viewport height.
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.65)));
      frame.style.setProperty('--p', progress.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Only play while visible — saves battery and data on mobile.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => {
            // Autoplay can be refused (data saver, low-power mode) — the
            // native controls stay available to start it by hand.
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted) void video.play().catch(() => {});
  }

  return (
    <section
      ref={sectionRef}
      id="demo"
      aria-labelledby="showreel-title"
      className="relative bg-[#fafaf7] px-6 pt-4 pb-20 sm:pb-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
            Goshen en 15 secondes
          </span>
          <h2
            id="showreel-title"
            className="mt-3 font-serif text-3xl font-bold text-stone-900 sm:text-4xl"
          >
            Voyez Goshen en action.
          </h2>
        </div>

        <div className="mt-10 [perspective:1400px] sm:mt-14">
          <div
            ref={frameRef}
            className="relative mx-auto origin-bottom rounded-[1.75rem] border border-stone-200 bg-stone-900 p-2 shadow-[0_30px_80px_-20px_rgba(6,78,59,0.35)] will-change-transform sm:rounded-[2.25rem] sm:p-3"
            style={{
              // --p goes 0 → 1 with scroll: tilted back and slightly
              // shrunk, then upright at full size.
              transform: `rotateX(calc((1 - var(--p, 0)) * ${MAX_TILT_DEG}deg)) scale(calc(0.9 + var(--p, 0) * 0.1)) translateY(calc((1 - var(--p, 0)) * 24px))`,
            }}
          >
            <div className="relative overflow-hidden rounded-[1.25rem] bg-black sm:rounded-[1.6rem]">
              <video
                ref={videoRef}
                src="/videos/goshen-showreel-16x9.mp4"
                className="block aspect-video h-auto w-full"
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Vidéo de présentation de Goshen Finance"
              />

              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={!muted}
                className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:bottom-4 sm:right-4"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  {muted ? (
                    <path d="m23 9-6 6M17 9l6 6" />
                  ) : (
                    <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
                  )}
                </svg>
                {muted ? 'Activer le son' : 'Couper le son'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
