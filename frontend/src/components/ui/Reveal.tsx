'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

// Scroll-triggered reveal — each section animates in only once, the
// instant it's actually visible, instead of everything being present at
// once on load. IntersectionObserver (not a scroll listener) so it costs
// nothing until the element nears the viewport. Respects
// prefers-reduced-motion by skipping straight to the visible state.
export function Reveal({
  children,
  delayMs = 0,
  className = '',
  immediate = false,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
  /**
   * Render visible from the very first paint, skipping the observer.
   *
   * Use it for everything above the fold. The animated path ships
   * `opacity-0` in the server HTML and only clears it once the bundle has
   * hydrated and IntersectionObserver has fired — on the hero that makes
   * the <h1> and the hero image invisible until then, so the browser
   * cannot record them as the Largest Contentful Paint. On the 3G
   * connections this app is built for, that pushes LCP seconds past the
   * 2.5s threshold for a paint the server had already delivered.
   */
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
