import { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/splash.css';

/**
 * Branded startup splash for easyParking.
 *
 * Takes over from the pre-rendered `#app-splash` element in index.html so the
 * screen is painted before the JS bundle arrives and never flashes white.
 *
 * Props
 *  - ready:        app is done booting. The splash stays up until this is true
 *                  *and* the 1.2s progress animation has finished.
 *  - onDone:       called once the exit animation has completed.
 *  - minDuration:  minimum time the splash stays visible (ms, default 1200).
 */
const BAR_DURATION = 1200;
const EXIT_DURATION = 420;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function SplashScreen({
  ready = true,
  onDone,
  minDuration = BAR_DURATION,
}) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const doneRef = useRef(false);
  // Captured once on mount: read-only values, safe to use while rendering.
  const [reducedMotion] = useState(prefersReducedMotion);
  // Milliseconds since navigation start: keeps the progress bar in sync with
  // the copy that index.html already started painting.
  const [elapsed] = useState(() =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : minDuration,
  );

  // Hand over from the static splash without a double paint.
  useEffect(() => {
    const preRendered = document.getElementById('app-splash');
    if (preRendered) preRendered.remove();

    if (window.__easyParkingSplashTimer) {
      window.clearTimeout(window.__easyParkingSplashTimer);
      delete window.__easyParkingSplashTimer;
    }

    document.documentElement.classList.add('app-splash-active');
    return () => {
      document.documentElement.classList.remove('app-splash-active');
    };
  }, []);

  // Wait for the app to be ready, but never cut the intro short.
  useEffect(() => {
    if (!ready || doneRef.current) return undefined;

    const remaining = Math.max(0, minDuration - elapsed);
    const timer = window.setTimeout(() => setLeaving(true), remaining);
    return () => window.clearTimeout(timer);
  }, [ready, minDuration, elapsed]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setGone(true);
    document.documentElement.classList.remove('app-splash-active');
    if (typeof onDone === 'function') onDone();
  }, [onDone]);

  // Fade out, then hand control back to the app.
  useEffect(() => {
    if (!leaving) return undefined;

    const timer = window.setTimeout(finish, reducedMotion ? 140 : EXIT_DURATION);
    return () => window.clearTimeout(timer);
  }, [leaving, finish, reducedMotion]);

  if (gone) return null;

  const progressDelay = Math.min(Math.max(0, elapsed), minDuration);

  return (
    <div
      className={`app-splash${leaving ? ' app-splash--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading easyParking"
    >
      <svg
        className="app-splash__mark"
        viewBox="0 0 72 72"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="6"
          y="6"
          width="60"
          height="60"
          rx="18"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="1.5"
        />
        <path
          d="M31 51V24h9.5a9 9 0 0 1 0 18H31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="app-splash__wordmark">
        easy<strong>Parking</strong>
      </p>
      <p className="app-splash__tagline">Parking management</p>

      <div className="app-splash__bar" aria-hidden="true">
        <span
          className="app-splash__bar-fill"
          style={
            progressDelay > 0 && !reducedMotion
              ? { animationDelay: `-${progressDelay}ms` }
              : undefined
          }
        />
      </div>
    </div>
  );
}
