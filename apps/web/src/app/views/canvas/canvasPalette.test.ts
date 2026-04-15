// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CANVAS_PALETTE_ID,
  normalizeCanvasPaletteId,
  deriveCanvasPaletteTokens,
} from './canvasPalette';

describe('canvasPalette', () => {
  it('normalizes legacy preset ids and shorthand hex values to canonical background colors', () => {
    expect(normalizeCanvasPaletteId('workbench')).toBe(DEFAULT_CANVAS_PALETTE_ID);
    expect(normalizeCanvasPaletteId('blueprint')).toBe('#152033');
    expect(normalizeCanvasPaletteId('#abc')).toBe('#aabbcc');
    expect(normalizeCanvasPaletteId('1D2D43')).toBe('#1d2d43');
    expect(normalizeCanvasPaletteId('not-a-color')).toBe(DEFAULT_CANVAS_PALETTE_ID);
  });

  it('derives stable tokens from normalized palette ids', () => {
    const tokens = deriveCanvasPaletteTokens(normalizeCanvasPaletteId('blueprint'));

    expect(tokens.surface).toBe('#152033');
    expect(tokens.grid).toContain('rgba(');
    expect(tokens.controlsForeground).toBe('#f8fafc');
    expect(tokens.panelToggleForeground).toBe('#f8fafc');
  });
});
