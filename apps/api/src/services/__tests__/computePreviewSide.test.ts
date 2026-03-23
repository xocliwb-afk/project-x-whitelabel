import { describe, it, expect } from 'vitest';
import { computePreviewSide } from '@project-x/shared-types';

const rect = (left: number, right: number) => ({ left, right });

describe('computePreviewSide', () => {
  // Map is 0–1200, lens centered at 600 (width ~100)
  const wideMap = rect(0, 1200);
  const centeredLens = rect(550, 650);

  it('returns null when mapRect is missing', () => {
    expect(computePreviewSide(null, centeredLens, true)).toBeNull();
    expect(computePreviewSide(undefined, centeredLens, false)).toBeNull();
  });

  it('returns null when lensRect is missing', () => {
    expect(computePreviewSide(wideMap, null, true)).toBeNull();
    expect(computePreviewSide(wideMap, undefined, false)).toBeNull();
  });

  it('keeps right when listOnRight=true and space is available', () => {
    // spaceRight = 1200 - (650 + 12) = 538, plenty for 320
    expect(computePreviewSide(wideMap, centeredLens, true)).toBe(true);
  });

  it('keeps left when listOnRight=false and space is available', () => {
    // spaceLeft = 550 - 12 - 0 = 538, plenty for 320
    expect(computePreviewSide(wideMap, centeredLens, false)).toBe(false);
  });

  it('flips to left when listOnRight=true but no space on right', () => {
    // Lens near right edge: left=1050, right=1150
    // spaceRight = 1200 - (1150 + 12) = 38 (< 320, not enough)
    // spaceLeft = 1050 - 12 - 0 = 1038 (> spaceRight, and >= 320)
    // → flips to left (false)
    const nearRightLens = rect(1050, 1150);
    expect(computePreviewSide(wideMap, nearRightLens, true)).toBe(false);
  });

  it('flips to right when listOnRight=false but no space on left', () => {
    // Lens near left edge: left=50, right=150
    // spaceLeft = 50 - 12 - 0 = 38 (too small)
    // spaceRight = 1200 - (150 + 12) = 1038 (>= 320) → flip to right (true)
    const nearLeftLens = rect(50, 150);
    expect(computePreviewSide(wideMap, nearLeftLens, false)).toBe(true);
  });

  it('stays on desired side when neither side has enough space', () => {
    // Narrow map: 0–400, lens centered at 200 (150–250)
    // spaceRight = 400 - (250 + 12) = 138
    // spaceLeft = 150 - 12 - 0 = 138
    // Neither >= 320, both equal → no flip
    const narrowMap = rect(0, 400);
    const narrowLens = rect(150, 250);
    expect(computePreviewSide(narrowMap, narrowLens, true)).toBe(true);
    expect(computePreviewSide(narrowMap, narrowLens, false)).toBe(false);
  });

  it('flips only when the other side is strictly better', () => {
    // Map 0–700, lens at 500–600
    // spaceRight = 700 - (600 + 12) = 88
    // spaceLeft = 500 - 12 - 0 = 488 (>= 320 and > 88) → should flip
    const map = rect(0, 700);
    const lens = rect(500, 600);
    expect(computePreviewSide(map, lens, true)).toBe(false);
  });
});
