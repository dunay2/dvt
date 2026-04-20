import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createCanvasRouteHarness,
  currentCanvasRouteState,
  expectCanvasBootstrapState,
  expectCanvasSurfaceState,
  renderCanvasRouteWithController,
  getPrimaryCanvasButtons,
} from './Canvas.test.support';

describe('Canvas route states', () => {
  let harness: ReturnType<typeof createCanvasRouteHarness>;

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
      name: 'renders a governed empty state when the workspace graph has no nodes',
      overrides: {
        explorerNodes: [],
      },
      surface: {
        text: 'No graph content loaded',
        slot: 'canvas-empty-state',
        viewportVisible: false,
      },
      bootstrap: {
        routeState: 'empty',
        bootstrapStatus: 'complete',
        bootstrapDetail: 'Canvas is ready with no graph content yet',
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

  it('renders read-only empty guidance without suggesting Add data when edits are gated', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expect(harness.container.textContent).toContain('No graph content loaded');
    expect(harness.container.textContent).toContain(
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.'
    );
    expect(harness.container.textContent).not.toContain('Use Add data');
    expect(currentCanvasRouteState().explorerProps?.onOpenDataRegistry).toBeUndefined();
  });

  it('renders a governed error state when the graph snapshot fails before any nodes are available', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      graphErrorMessage: 'workspace graph unavailable',
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText: 'workspace graph unavailable',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'error',
      bootstrapDetail: 'workspace graph unavailable',
      canCompleteBootstrap: false,
    });
  });

  it('blocks the canvas surface in api mode when backend readiness is not satisfied', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);

    expectCanvasSurfaceState({
      harness,
      text: 'Backend not ready',
      extraText: 'Readiness not satisfied: database_not_configured.',
      slot: 'canvas-blocked-state',
      viewportVisible: false,
    });
    expect(layoutButton).toBeDefined();
    expect(planButton).toBeDefined();
    expect(runButton).toBeDefined();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'blocked_backend',
      bootstrapStatus: 'blocked',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: false,
    });
  });

  it('prioritizes backend blocked route state over draft recovery banners', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      draftRecoveryReason: 'missing_remote',
      draftToolbarState: {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-missing-remote-draft-state"]')
    ).toBeNull();
    expectCanvasBootstrapState({
      routeState: 'blocked_backend',
      bootstrapStatus: 'blocked',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: false,
    });
  });
});
