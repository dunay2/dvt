import type { CSSProperties } from 'react';

export type CanvasPaletteId = `#${string}`;

export const DEFAULT_CANVAS_PALETTE_ID: CanvasPaletteId = '#101826';
export const DEFAULT_CANVAS_GRID_COLOR: CanvasPaletteId = '#94a3b8';

type Rgb = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

export type CanvasPaletteTokens = {
  readonly surface: CanvasPaletteId;
  readonly grid: string;
  readonly controlsSurface: string;
  readonly controlsButtonSurface: string;
  readonly controlsButtonHover: string;
  readonly controlsBorder: string;
  readonly controlsForeground: string;
  readonly minimapSurface: string;
  readonly minimapBorder: string;
  readonly minimapMask: string;
  readonly minimapMaskStroke: string;
  readonly panelToggleSurface: string;
  readonly panelToggleHover: string;
  readonly panelToggleBorder: string;
  readonly panelToggleForeground: string;
  readonly previewAccent: string;
};

function expandShortHex(value: string): CanvasPaletteId {
  const expanded = value
    .split('')
    .map((channel) => `${channel}${channel}`)
    .join('');

  return `#${expanded}`;
}

function resolveHexPaletteId(value: string): CanvasPaletteId | null {
  const normalizedValue = value.trim().toLowerCase();
  const withoutHash = normalizedValue.startsWith('#') ? normalizedValue.slice(1) : normalizedValue;

  if (/^[0-9a-f]{3}$/i.test(withoutHash)) {
    return expandShortHex(withoutHash);
  }

  if (/^[0-9a-f]{6}$/i.test(withoutHash)) {
    return `#${withoutHash}`;
  }

  return null;
}

export function normalizeCanvasPaletteId(value: unknown): CanvasPaletteId {
  if (typeof value !== 'string') {
    return DEFAULT_CANVAS_PALETTE_ID;
  }

  return resolveHexPaletteId(value) ?? DEFAULT_CANVAS_PALETTE_ID;
}

export function normalizeCanvasHexColor(
  value: unknown,
  fallback: CanvasPaletteId
): CanvasPaletteId {
  if (typeof value !== 'string') {
    return fallback;
  }

  return resolveHexPaletteId(value) ?? fallback;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: CanvasPaletteId): Rgb {
  const value = hex.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mixColor(base: Rgb, target: Rgb, ratio: number): Rgb {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return {
    r: clampChannel(base.r + (target.r - base.r) * safeRatio),
    g: clampChannel(base.g + (target.g - base.g) * safeRatio),
    b: clampChannel(base.b + (target.b - base.b) * safeRatio),
  };
}

function toHex(color: Rgb): CanvasPaletteId {
  const channel = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function toRgba(color: Rgb, alpha: number): string {
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${alpha})`;
}

function resolveSurfaceContrast(surface: Rgb): string {
  const luminance = (0.2126 * surface.r + 0.7152 * surface.g + 0.0722 * surface.b) / 255;
  return luminance > 0.48 ? '#0b1220' : '#f8fafc';
}

export function deriveCanvasPaletteTokens(surfaceHex: CanvasPaletteId): CanvasPaletteTokens {
  const normalizedSurfaceHex = normalizeCanvasPaletteId(surfaceHex);
  const surface = hexToRgb(normalizedSurfaceHex);
  const white: Rgb = { r: 248, g: 250, b: 252 };
  const black: Rgb = { r: 5, g: 9, b: 15 };
  const grid = mixColor(surface, white, 0.48);
  const border = mixColor(surface, white, 0.28);
  const borderStrong = mixColor(surface, white, 0.38);
  const hover = mixColor(surface, white, 0.12);
  const deep = mixColor(surface, black, 0.18);
  const maskBase = mixColor(surface, black, 0.5);
  const minimapBase = mixColor(surface, black, 0.08);

  return {
    surface: normalizedSurfaceHex,
    grid: toRgba(grid, 0.2),
    controlsSurface: toRgba(deep, 0.94),
    controlsButtonSurface: toRgba(surface, 0.96),
    controlsButtonHover: toRgba(hover, 0.98),
    controlsBorder: toHex(border),
    controlsForeground: resolveSurfaceContrast(surface),
    minimapSurface: toRgba(minimapBase, 0.88),
    minimapBorder: toHex(border),
    minimapMask: toRgba(maskBase, 0.62),
    minimapMaskStroke: toHex(borderStrong),
    panelToggleSurface: toRgba(deep, 0.94),
    panelToggleHover: toRgba(hover, 0.98),
    panelToggleBorder: toHex(border),
    panelToggleForeground: resolveSurfaceContrast(surface),
    previewAccent: toRgba(mixColor(surface, white, 0.22), 0.18),
  };
}

export function createCanvasPreviewStyle(surfaceHex: CanvasPaletteId): CSSProperties {
  const tokens = deriveCanvasPaletteTokens(surfaceHex);

  return {
    backgroundColor: tokens.surface,
    backgroundImage: `radial-gradient(circle at 18% 22%, ${tokens.previewAccent} 0, transparent 38%), linear-gradient(${tokens.grid} 1px, transparent 1px), linear-gradient(90deg, ${tokens.grid} 1px, transparent 1px)`,
    backgroundPosition: '0 0, 0 0, 0 0',
    backgroundSize: '100% 100%, 14px 14px, 14px 14px',
  };
}
