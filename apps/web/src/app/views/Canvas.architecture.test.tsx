import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from './architecture.test.support';

const CANVAS_ROUTE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'Canvas.tsx');

describe('Canvas route architecture', () => {
  it('delegates transport-state rendering and recovery banners to dedicated presentation seams', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain('deriveCanvasRouteViewState');
    expect(CANVAS_ROUTE_SOURCE).toContain('useCanvasPresentationLifecycle');
    expect(CANVAS_ROUTE_SOURCE).toContain('buildCanvasShellProps');
    expect(CANVAS_ROUTE_SOURCE).toContain('CanvasModalLayer');
    expect(CANVAS_ROUTE_SOURCE).toContain('renderCanvasCenterSurface');
    expect(CANVAS_ROUTE_SOURCE).toContain('CanvasRecoveryBanner');
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasDraftPresentationModel'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasDraftPresentationStore'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain('canvasDraftPresentationState');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('getCanvasWorkbenchState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('deriveCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-stale-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-missing-remote-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-draft-projection-gap-state"');
  });
});
