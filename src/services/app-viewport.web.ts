import { resolveAppHeight } from '@/services/viewport-height';

const HEIGHT_VARIABLE = '--app-height';

/**
 * iOS can report a short viewport on the first paint after a launch or a resume
 * and correct it a moment later, so measure again a few times while the app
 * settles rather than trusting the first reading.
 */
const SETTLE_DELAYS = [0, 120, 500, 1200];

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function syncAppHeight(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined;
  }

  const apply = () => {
    const height = resolveAppHeight({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      screenHeight: window.screen?.height ?? 0,
      standalone: isStandalone(),
    });

    if (height !== null) {
      document.documentElement.style.setProperty(HEIGHT_VARIABLE, `${Math.round(height)}px`);
    }
  };

  const timers = SETTLE_DELAYS.map((delay) => setTimeout(apply, delay));
  // `resize` covers rotation and split view; the rest cover coming back from the
  // background, which is where a stale viewport usually survives.
  const windowEvents = ['resize', 'orientationchange', 'pageshow', 'focus'] as const;
  windowEvents.forEach((event) => window.addEventListener(event, apply));
  document.addEventListener('visibilitychange', apply);

  return () => {
    timers.forEach(clearTimeout);
    windowEvents.forEach((event) => window.removeEventListener(event, apply));
    document.removeEventListener('visibilitychange', apply);
  };
}
