import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_SAFE_AREA_SHORTFALL, resolveAppHeight } from '../src/services/viewport-height.ts';

function metrics(overrides = {}) {
  // An iPhone with a home indicator, reporting a viewport short by that inset.
  return {
    innerWidth: 430,
    innerHeight: 898,
    screenHeight: 932,
    standalone: true,
    ...overrides,
  };
}

test('fills the screen when a standalone PWA reports a short viewport', () => {
  assert.equal(resolveAppHeight(metrics()), 932);
});

test('leaves an accurate viewport alone', () => {
  assert.equal(resolveAppHeight(metrics({ innerHeight: 932 })), 932);
});

test('never shrinks the app when the viewport is taller than the screen', () => {
  assert.equal(resolveAppHeight(metrics({ innerHeight: 950 })), 950);
});

test('ignores the screen height in a browser tab, where chrome is real', () => {
  assert.equal(resolveAppHeight(metrics({ standalone: false })), 898);
});

test('ignores a shortfall too large to be a safe-area miscount', () => {
  const chrome = resolveAppHeight(metrics({ innerHeight: 932 - MAX_SAFE_AREA_SHORTFALL - 1 }));
  assert.equal(chrome, 932 - MAX_SAFE_AREA_SHORTFALL - 1);
});

test('accepts a shortfall exactly at the limit', () => {
  assert.equal(resolveAppHeight(metrics({ innerHeight: 932 - MAX_SAFE_AREA_SHORTFALL })), 932);
});

test('does not use the screen height in landscape, where iOS does not swap it', () => {
  assert.equal(resolveAppHeight(metrics({ innerWidth: 932, innerHeight: 430 })), 430);
});

test('falls back to null when the viewport is unusable', () => {
  assert.equal(resolveAppHeight(metrics({ innerHeight: 0 })), null);
  assert.equal(resolveAppHeight(metrics({ innerHeight: Number.NaN })), null);
});

test('keeps the reported viewport when the screen height is unavailable', () => {
  assert.equal(resolveAppHeight(metrics({ screenHeight: Number.NaN })), 898);
  assert.equal(resolveAppHeight(metrics({ screenHeight: 0 })), 898);
});
