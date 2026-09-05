/**
 * Owned concern: guard route-composition architecture for the governed Canvas route.
 */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from './architecture.test.support';

const CANVAS_ROUTE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'Canvas.tsx');

describe('Canvas route architecture', () => {
  it('delegates graph-draft presentation syncing to a dedicated seam', () => {
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

  it('mounts one Canvas shell and modal composition for every supported authority', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain('function CanvasRouteSurface');
    expect(CANVAS_ROUTE_SOURCE.match(/<CanvasShell\b/g)).toHaveLength(1);
    expect(CANVAS_ROUTE_SOURCE.match(/<CanvasModalHost\b/g)).toHaveLength(1);
    expect(CANVAS_ROUTE_SOURCE).toContain('<CanvasRouteSurface');
    expect(CANVAS_ROUTE_SOURCE).toContain('useDbtProjectFilesAuthoritySurface');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('DbtProjectFileCanvas');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('DbtProjectFileCanvasView');
  });

  it('builds semantic shell and modal contracts through authority adapters', () => {
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasShellPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/canvasModalHostPropsBuilder'");
    expect(CANVAS_ROUTE_SOURCE).toContain("'./canvas/CanvasModalHost'");
    expect(CANVAS_ROUTE_SOURCE).toContain('...buildCanvasShellProps({');
    expect(CANVAS_ROUTE_SOURCE).toContain('modalHostProps={buildCanvasModalHostProps(controller)}');
    expect(CANVAS_ROUTE_SOURCE).toContain(
      'const warehouseSourceImport = useWarehouseSourceImportPort();'
    );
    expect(CANVAS_ROUTE_SOURCE).toContain('warehouseSourceImport,');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasModalLayer');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('renderCanvasCenterSurface');
    expect(CANVAS_ROUTE_SOURCE).not.toContain('CanvasRecoveryBanner');
  });
});
