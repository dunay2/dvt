import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
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
      readinessStatus: 'failed',
      readinessDetail: 'workspace graph unavailable',
    });
  });

  it('fails closed for unsupported canvas kind across graph, inspector, Plan, and Run', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'retired-canvas-kind',
        title: 'Retired canvas',
      },
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canPersistGraphDraft: true,
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
    expect(harness.container.querySelector('input[name="node-name"]')).toBeNull();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      readinessStatus: 'failed',
      readinessDetail:
        'Canvas cannot open persisted canvas kind "retired-canvas-kind" because no runtime registration is available.',
    });
  });

  it('fails closed when a retired canvas kind has no runtime registration', async () => {
    await renderCanvasRouteWithController(harness, {
      canvasDocument: {
        kind: 'dbt',
        title: 'dbt canvas',
      },
      inspectorNode: buildInspectorFixtureNode(),
      canEditInspectorNode: true,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
        canPersistGraphDraft: true,
        canManagePlugins: false,
        canManageRBAC: false,
      },
    });

    expectCanvasSurfaceState({
      harness,
      text: 'Canvas unavailable',
      extraText:
        'Canvas cannot open persisted canvas kind "dbt" because no runtime registration is available.',
      slot: 'canvas-error-state',
      viewportVisible: false,
    });
    expectPrimaryCanvasActionsBlocked(harness.container);
    expectCanvasRegistryClosed();
    expectCanvasBootstrapState({
      routeState: 'error_graph',
      readinessStatus: 'failed',
      readinessDetail:
        'Canvas cannot open persisted canvas kind "dbt" because no runtime registration is available.',
    });
  });

  it('blocks the canvas surface when backend readiness is not satisfied', async () => {
    await renderCanvasRouteWithController(harness, {
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
    });

    expectBlockedCanvasRouteState({
      harness,
      text: 'Backend not ready',
      detail: 'Readiness not satisfied: database_not_configured.',
      routeState: 'blocked_backend',
      readinessStatus: 'complete',
    });
  });

  it('keeps the backend blocker as the primary surface when the Log tab is active', async () => {
    await renderCanvasRouteWithController(
      harness,
      {
        backendReady: false,
        backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      },
      {
        initialEntry: '/canvas/logs',
      }
    );

    expectBlockedCanvasRouteState({
      harness,
      text: 'Backend not ready',
      detail: 'Readiness not satisfied: database_not_configured.',
      routeState: 'blocked_backend',
      readinessStatus: 'complete',
    });
    expect(harness.container.querySelector('[data-slot="canvas-workbench-log-panel"]')).toBeNull();
  });

  it('prioritizes backend blocked route state over draft recovery banners', async () => {
    await renderCanvasRouteWithController(harness, {
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      draftRecoveryReason: 'missing_remote',
      draftStatusState: {
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
      readinessStatus: 'complete',
      readinessDetail: 'Readiness not satisfied: database_not_configured.',
    });
  });

  it('keeps Canvas route commands hidden on blocked backend route even when draft reload remains available', async () => {
    await renderCanvasRouteWithController(harness, {
      backendReady: false,
      backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      draftRecoveryReason: 'missing_remote',
      draftStatusState: {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      },
    });

    expectPrimaryCanvasActionsBlocked(harness.container);
    expect(harness.container.textContent).not.toContain('Reload latest draft');
  });
});
