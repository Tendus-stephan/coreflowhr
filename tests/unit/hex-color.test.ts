import { describe, it, expect } from 'vitest';
import { darkenHex } from '../../utils/colorUtils';

describe('darkenHex', () => {
  it('darkens a mid-range color by the specified amount', () => {
    // #808080 RGB = 128,128,128 — darken by 28 → 100,100,100 = #646464
    expect(darkenHex('#808080', 28)).toBe('#646464');
  });

  it('#ffffff darkened by any positive amount is not #ffffff', () => {
    expect(darkenHex('#ffffff', 1)).not.toBe('#ffffff');
  });

  it('clamps each channel at 0 — never goes negative', () => {
    // Darkening pure black should stay #000000
    expect(darkenHex('#000000', 100)).toBe('#000000');
  });

  it('darkening by 0 returns the same color', () => {
    expect(darkenHex('#1e3a5f', 0)).toBe('#1e3a5f');
  });

  it('works without a leading # (handles bare hex)', () => {
    // darkenHex strips # internally — passing without should work
    const withHash = darkenHex('#808080', 10);
    const withoutHash = darkenHex('808080', 10);
    expect(withHash).toBe(withoutHash);
  });

  it('darkens each channel independently', () => {
    // #ff0000 (255,0,0) darkened by 55 → (200,0,0) = #c80000
    expect(darkenHex('#ff0000', 55)).toBe('#c80000');
  });

  it('darken by 38 (used in buildGradient) stays valid hex', () => {
    const result = darkenHex('#1e3a5f', 38);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('handles uppercase hex input', () => {
    const lower = darkenHex('#aabbcc', 10);
    const upper = darkenHex('#AABBCC', 10);
    expect(lower).toBe(upper);
  });
});
