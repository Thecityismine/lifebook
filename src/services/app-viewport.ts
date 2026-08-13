/**
 * Native builds get their height from the window itself, so there is nothing to
 * keep in sync. See app-viewport.web.ts for the browser implementation.
 */
export function syncAppHeight(): () => void {
  return () => undefined;
}
