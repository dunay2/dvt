/**
 * Owned concern: guard route-composition architecture for the governed Canvas route.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from './architecture.test.support';

const CANVAS_ROUTE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'Canvas.tsx');

describe('Canvas route architecture', () => {
  it('delegates transport-state rendering and recovery banners to dedicated presentation seams', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain('deriveCanvasRouteViewState');
    expect(CANVAS_ROUTE_SOURCE).toContain('buildCanvasShellProps');
    expect(CANVAS_ROUTE_SOURCE).toContain('useCanvasRoutePresentationSync');
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/useCanvasRoutePresentationSync'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/canvasDraftPresentationModel'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/CanvasCenterSurface'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/CanvasRecoveryBanner'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/canvasDraftPresentationStore'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain('usePublishedRouteBootstrap(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('publishCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('resetCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('canvasDraftPresentationState');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('getCanvasWorkbenchState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('deriveCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-stale-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-missing-remote-draft-state"');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('data-slot="canvas-draft-projection-gap-state"');
  });

  it('builds semantic shell and modal contracts through dedicated builder seams', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasShellPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasModalHostPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/CanvasModalHost'");
    expect(CANVAS_ROUTE_SOURCE).toContain('useCanvasRoutePresentationSync(presentationState);');
    expect(CANVAS_ROUTE_SOURCE).toContain('const shellProps = buildCanvasShellProps({');
    expect(CANVAS_ROUTE_SOURCE).toContain(
      'const modalHostProps = buildCanvasModalHostProps(controller);'
    );
    expect(CANVAS_ROUTE_SOURCE).toContain('controller,');
    expect(CANVAS_ROUTE_SOURCE).toContain('routeViewState,');
    expect(CANVAS_ROUTE_SOURCE).toContain('<CanvasShell {...shellProps} />');
    expect(CANVAS_ROUTE_SOURCE).toContain('<CanvasModalHost {...modalHostProps} />');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('const shellProps: CanvasShellProps = {');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('<CanvasModalHost controller={controller} />');
  });
});
