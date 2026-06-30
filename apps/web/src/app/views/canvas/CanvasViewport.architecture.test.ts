import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_VIEWPORT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewport.tsx'
);
const CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewportSurfaceView.tsx'
);
const CANVAS_VIEWPORT_STYLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasViewportStyle.ts'
);
const CANVAS_VIEWPORT_LIFECYCLE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasViewportLifecycle.ts'
);

describe('CanvasViewport architecture', () => {
  it('keeps the route-facing viewport as an orchestrator, not the React Flow template', () => {
    expect(CANVAS_VIEWPORT_SOURCE).toContain('CanvasViewportSurfaceView');
    expect(CANVAS_VIEWPORT_SOURCE).toContain('useCanvasViewportLifecycle');
    expect(CANVAS_VIEWPORT_SOURCE).toContain('resolveCanvasViewportStyle');

    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+ReactFlow,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+Background,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+Controls,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/^\s+MiniMap,/m);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<ReactFlow(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<Background(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<Controls(?:\s|>)/);
    expect(CANVAS_VIEWPORT_SOURCE).not.toMatch(/<MiniMap(?:\s|>)/);
  });

  it('keeps presentation, styling, and lifecycle responsibilities in named components', () => {
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('function CanvasViewportSurfaceView');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('<ReactFlow');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('CanvasContextMenuView');
    expect(CANVAS_VIEWPORT_SURFACE_VIEW_SOURCE).toContain('resolveMiniMapNodeColor');

    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('export function resolveCanvasViewportStyle');
    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('export function applyCanvasViewportStyle');
    expect(CANVAS_VIEWPORT_STYLE_SOURCE).toContain('deriveCanvasPaletteTokens');

    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain(
      'export function useCanvasViewportLifecycle'
    );
    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain('reactFlow.setViewport');
    expect(CANVAS_VIEWPORT_LIFECYCLE_SOURCE).toContain('.fitView({');
  });
});
