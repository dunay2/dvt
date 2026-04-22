/**
 * Owned concern: guard route-composition architecture for the governed Canvas route.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from './architecture.test.support';

const CANVAS_ROUTE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'Canvas.tsx');

describe('Canvas route architecture', () => {
  it('delegates route presentation syncing to a dedicated seam', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain('deriveCanvasRouteViewState');
    expect(CANVAS_ROUTE_SOURCE).toContain('useCanvasRoutePresentationSync');
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/useCanvasRoutePresentationSync'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/canvasDraftPresentationModel'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain("'./canvas/canvasDraftPresentationStore'");
    expect(CANVAS_ROUTE_SOURCE).not.toContain('usePublishedRouteBootstrap(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('publishCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('resetCanvasDraftPresentationState(');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('deriveCanvasDraftPresentationState(');
  });

  it('builds semantic shell and modal contracts through dedicated builder seams', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasShellPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasModalHostPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/CanvasModalHost'");
    expect(CANVAS_ROUTE_SOURCE).toContain('const shellProps = buildCanvasShellProps({');
    expect(CANVAS_ROUTE_SOURCE).toContain(
      'const modalHostProps = buildCanvasModalHostProps(controller);'
    );
    expect(CANVAS_ROUTE_SOURCE).toContain('<CanvasShell {...shellProps} />');
    expect(CANVAS_ROUTE_SOURCE).toContain('<CanvasModalHost {...modalHostProps} />');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasModalLayer');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('renderCanvasCenterSurface');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasRecoveryBanner');
  });
});
