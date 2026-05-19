import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildController,
  buildInspectorFixtureNode,
  createCanvasRouteHarness,
  expectBlockedCanvasRouteState,
  expectCanvasBootstrapState,
  expectCanvasRegistryClosed,
  expectCanvasSurfaceState,
  expectPrimaryCanvasActionsBlocked,
  renderCanvasRouteWithController,
  type CanvasRouteHarness,
} from './Canvas.test.support';

describe('Canvas route backend and recovery priority', () => {
  let harness: CanvasRouteHarness;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
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
      bootstrapStatus: 'failed',
      bootstrapDetail: 'workspace graph unavailable',
      canCompleteBootstrap: true,
    });
  });

  it('fails closed for unsupported canvas kind across graph, inspector, Plan, and Run', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'retired-canvas-kind',
        title: 'Retired canvas',
      },
      explorerNodes: [],
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText:
        'Canvas cannot open persisted canvas kind "retired-canvas-kind" because no runtime registration is available.',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectPrimaryCanvasActionsBlocked(harness.container);
    expectCanvasRegistryClosed();
    expect(harness.container.textContent).toContain(
      'Node details are read-only for this workspace state.'
    );
    expect(
      harness.container
        .querySelector<HTMLInputElement>('input[name="node-name"]')
        ?.getAttribute('disabled')
    ).not.toBeNull();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'failed',
      bootstrapDetail:
        'Canvas cannot open persisted canvas kind "retired-canvas-kind" because no runtime registration is available.',
      canCompleteBootstrap: true,
    });
  });

  it('fails closed with disabled-plugin guidance for registered but unavailable canvas kinds', async () => {
    const controller = buildController();

    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      availableCanvasKinds: controller.availableCanvasKinds.filter(
        (registration) => registration.kind !== 'dbt'
      ),
      explorerNodes: [],
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText:
        'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectPrimaryCanvasActionsBlocked(harness.container);
    expectCanvasRegistryClosed();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      bootstrapStatus: 'failed',
      bootstrapDetail:
        'Canvas cannot open persisted canvas kind "dbt" because its plugin is disabled or unavailable.',
      canCompleteBootstrap: true,
    });
  });

  it('blocks the canvas surface in api mode when backend readiness is not satisfied', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'api',
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
    });

    expectBlockedCanvasRouteState({
      harness,
      text: 'Backend not ready',
      detail: 'Readiness not satisfied: database_not_configured.',
      routeState: 'blocked_backend',
      bootstrapStatus: 'complete',
      canCompleteBootstrap: true,
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
      bootstrapStatus: 'complete',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: true,
    });
  });

  it('keeps Canvas route commands hidden on blocked backend route even when draft reload remains available', async () => {
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

    expectPrimaryCanvasActionsBlocked(harness.container);
    expect(harness.container.textContent).not.toContain('Reload latest draft');
  });
});
