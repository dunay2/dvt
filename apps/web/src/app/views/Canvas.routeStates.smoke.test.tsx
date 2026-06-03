import { afterEach, beforeEach, describe, it } from 'vitest';

import {
  createCanvasRouteHarness,
  expectCanvasBootstrapState,
  expectCanvasSurfaceState,
  renderCanvasRouteWithController,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route state smoke', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it.each([
    {
      name: 'renders a governed loading state inside the canvas workbench',
      overrides: {
        isLoadingGraph: true,
        explorerNodes: [],
      },
      surface: {
        text: 'Loading canvas',
        slot: 'canvas-loading-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'loading_graph',
        bootstrapStatus: 'pending',
        bootstrapDetail: 'Loading workspace graph for canvas',
        canCompleteBootstrap: false,
      },
    },
    {
      name: 'renders a playground host state when the workspace has no canvas document yet',
      overrides: {
        explorerNodes: [],
        canvasDocument: null,
      },
      surface: {
        text: 'Create canvas',
        slot: 'canvas-playground-empty-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'needs_canvas',
        bootstrapStatus: 'complete',
        bootstrapDetail: 'Canvas playground is ready to create the first canvas',
        canCompleteBootstrap: true,
      },
    },
  ])('$name', async ({ overrides, surface, bootstrap }) => {
    await renderCanvasRouteWithController(harness, overrides);
    expectCanvasSurfaceState({
      harness,
      text: surface.text,
      slot: surface.slot,
      viewportVisible: surface.viewportVisible,
    });
    expectCanvasBootstrapState(bootstrap);
  });
});
