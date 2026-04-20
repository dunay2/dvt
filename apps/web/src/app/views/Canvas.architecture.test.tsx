import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CANVAS_ROUTE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'Canvas.tsx'),
  'utf8'
);

describe('Canvas route architecture', () => {
  it('delegates transport-state rendering and recovery banners to dedicated presentation seams', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain('deriveCanvasRouteViewState');
    expect(CANVAS_ROUTE_SOURCE).toContain('renderCanvasCenterSurface');
    expect(CANVAS_ROUTE_SOURCE).toContain('CanvasRecoveryBanner');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('getCanvasWorkbenchState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('deriveCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-stale-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-missing-remote-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-draft-projection-gap-state"');
  });
});
