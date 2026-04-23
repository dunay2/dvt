import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import {
  createCanvasRouteHarness,
  currentCanvasRouteState,
  expectCanvasBootstrapState,
  expectCanvasSurfaceState,
  renderCanvasRouteWithController,
  getPrimaryCanvasButtons,
} from './Canvas.test.support';

type CanvasRouteHarness = ReturnType<typeof createCanvasRouteHarness>;

function expectCanvasRegistryClosed(): void {
  expect(currentCanvasRouteState().explorerProps?.onOpenDataRegistry).toBeUndefined();
}

function expectPrimaryCanvasActionsBlocked(container: ParentNode): void {
  const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(container);

  expect(layoutButton).toBeDefined();
  expect(planButton).toBeDefined();
  expect(runButton).toBeDefined();
  expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
  expect(planButton?.getAttribute('disabled')).not.toBeNull();
  expect(runButton?.getAttribute('disabled')).not.toBeNull();
}

function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = DVT_AUTHORING_NODE_KINDS.find((candidate) => candidate.kind === kind);
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

function expectBlockedCanvasRouteState(args: {
  harness: CanvasRouteHarness;
  text: string;
  detail: string;
  routeState: 'blocked_runtime' | 'blocked_backend';
}): void {
  const { harness, text, detail, routeState } = args;

  expectCanvasSurfaceState({
    harness,
    text,
    extraText: detail,
    slot: 'canvas-blocked-state',
    viewportVisible: false,
  });
  expectPrimaryCanvasActionsBlocked(harness.container);
  expectCanvasBootstrapState({
    routeState,
    bootstrapStatus: 'blocked',
    bootstrapDetail: detail,
    canCompleteBootstrap: false,
  });
  expectCanvasRegistryClosed();
}

describe('Canvas route states', () => {
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
      name: 'renders a governed empty state when the workspace graph has no nodes',
      overrides: {
        explorerNodes: [],
      },
      surface: {
        text: 'No graph content loaded',
        slot: 'canvas-empty-state',
        viewportVisible: true,
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
    expectCanvasRegistryClosed();
  });

  it('routes empty authoring first-node creation through the controller command', async () => {
    const handleCreateAuthoringNode = vi.fn();
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      handleCreateAuthoringNode,
    });

    const sourceButton = Array.from(harness.container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Source')
    );

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.textContent).toContain('Add first node');
    expect(sourceButton).toBeDefined();

    sourceButton?.click();

    expect(handleCreateAuthoringNode).toHaveBeenCalledWith(
      requireAuthoringNodeKind('dvt:source')
    );
  });

  it('renders empty guidance without suggesting Add data when source import is unavailable', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      canOpenSourceImport: false,
    } as never);

    expect(harness.container.textContent).toContain('No graph content loaded');
    expect(harness.container.textContent).toContain('Source import is unavailable in this runtime');
    expect(harness.container.textContent).not.toContain('Use Add data');
    expectCanvasRegistryClosed();
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

  it('fails closed when canvas authoring is mounted outside api runtime mode', async () => {
    await renderCanvasRouteWithController(harness, {
      dataSourceMode: 'mock',
      explorerNodes: [],
    });

    expectBlockedCanvasRouteState({
      harness,
      text: 'Canvas runtime unavailable',
      detail: 'Canvas authoring requires API runtime mode and protected workspace draft access.',
      routeState: 'blocked_runtime',
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

  it('keeps toolbar workflow posture aligned with blocked backend route even when draft reload remains available', async () => {
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

    const toolbarText =
      document.getElementById('shell-top-bar-canvas-controls')?.textContent ?? '';

    expect(toolbarText).toContain('Read only');
    expect(toolbarText).not.toContain('Recovery');
    expect(toolbarText).toContain('Reload latest draft');
  });
});
