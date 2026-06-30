/** Owned concern: resolve Canvas viewport CSS variables from governed palette preferences. */
import type { CSSProperties } from 'react';

import { deriveCanvasPaletteTokens, type CanvasPaletteId } from './canvasPalette';

export function resolveCanvasViewportStyle(
  canvasPalette: CanvasPaletteId,
  gridSize: number,
  options: Readonly<{
    gridVisible?: boolean;
    gridColor?: CanvasPaletteId;
  }> = {}
): CSSProperties {
  const tokens = deriveCanvasPaletteTokens(canvasPalette);
  const gridVisible = options.gridVisible ?? true;

  return {
    '--canvas-surface': tokens.surface,
    '--canvas-grid': gridVisible ? (options.gridColor ?? tokens.grid) : 'transparent',
    '--canvas-controls-surface': tokens.controlsSurface,
    '--canvas-controls-button-surface': tokens.controlsButtonSurface,
    '--canvas-controls-button-hover': tokens.controlsButtonHover,
    '--canvas-controls-border': tokens.controlsBorder,
    '--canvas-controls-foreground': tokens.controlsForeground,
    '--canvas-minimap-surface': tokens.minimapSurface,
    '--canvas-minimap-border': tokens.minimapBorder,
    '--canvas-minimap-mask': tokens.minimapMask,
    '--canvas-minimap-mask-stroke': tokens.minimapMaskStroke,
    '--canvas-panel-toggle-surface': tokens.panelToggleSurface,
    '--canvas-panel-toggle-hover': tokens.panelToggleHover,
    '--canvas-panel-toggle-border': tokens.panelToggleBorder,
    '--canvas-panel-toggle-foreground': tokens.panelToggleForeground,
    '--canvas-grid-gap': `${gridSize}px`,
  } as CSSProperties;
}

export function applyCanvasViewportStyle(
  element: HTMLDivElement,
  canvasStyle: CSSProperties
): void {
  for (const [property, value] of Object.entries(canvasStyle)) {
    if (typeof value !== 'string') {
      continue;
    }

    element.style.setProperty(property, value);
  }
}
