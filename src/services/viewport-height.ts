/**
 * A standalone (home screen) PWA has no browser chrome, so the app should be
 * exactly as tall as the screen. iOS sometimes reports a viewport short by the
 * safe-area insets on the first paint after launch or resume, and only corrects
 * it once something forces a recount -- which is why rotating the device clears
 * the strip of background that shows up under the tab bar.
 *
 * Kept free of DOM access so the decision itself can be tested.
 */

export type ViewportMetrics = {
  innerWidth: number;
  innerHeight: number;
  screenHeight: number;
  standalone: boolean;
};

/**
 * The largest shortfall treated as the iOS miscount. Anything bigger is real
 * chrome (a browser toolbar, a split view) that the app must not paint over.
 */
export const MAX_SAFE_AREA_SHORTFALL = 120;

export function resolveAppHeight(metrics: ViewportMetrics): number | null {
  const { innerWidth, innerHeight, screenHeight, standalone } = metrics;

  if (!Number.isFinite(innerHeight) || innerHeight <= 0) {
    return null;
  }

  if (!standalone || !Number.isFinite(screenHeight)) {
    return innerHeight;
  }

  // Only portrait: iOS reports screen dimensions in their natural orientation,
  // so in landscape the screen height is not the height of the viewport.
  const portrait = innerWidth <= innerHeight;
  const shortfall = screenHeight - innerHeight;

  return portrait && shortfall > 0 && shortfall <= MAX_SAFE_AREA_SHORTFALL
    ? screenHeight
    : innerHeight;
}
