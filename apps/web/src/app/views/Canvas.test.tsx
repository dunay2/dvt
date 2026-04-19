// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getPublishedRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from '../bootstrap/routeBootstrapRegistry';
import { getRouteBootstrapRegistration } from '../bootstrap/routeBootstrapRegistration';
import Canvas from './Canvas';
import { DEFAULT_CANVAS_PALETTE_ID } from './canvas/canvasPalette';
import {
  CANVAS_ROUTE_BOOTSTRAP_HANDLE,
  getCanvasDraftPresentationState,
  resetCanvasDraftPresentationState,
  type CanvasDraftToolbarState,
} from './canvas/canvasDraftPresentationState';
import { useCanvasController } from './canvas/useCanvasController';

const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

const canvasRouteState = vi.hoisted(() => ({
  explorerProps: null as null | Record<string, unknown>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./canvas/useCanvasController', () => ({
  useCanvasController: vi.fn(),
}));

vi.mock('../components/DbtExplorer', () => ({
  default: (props: Record<string, unknown>) => {
    canvasRouteState.explorerProps = props;
    return <div data-slot="canvas-explorer-panel">Explorer</div>;
  },
}));

vi.mock('../components/InspectorPanel', () => ({
  default: () => <div data-slot="canvas-inspector-panel">Inspector</div>,
}));

vi.mock('../components/SourceImportWizard', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>Import wizard open</div> : null),
}));

vi.mock('./canvas/CanvasViewport', () => ({
  default: () => <div data-slot="canvas-viewport">Viewport</div>,
}));

vi.mock('../components/Modals', () => ({
  PlanPreviewModal: ({ open }: { open: boolean }) => (open ? <div>Plan preview modal</div> : null),
  ConfirmEdgeModal: ({ open }: { open: boolean }) => (open ? <div>Confirm edge modal</div> : null),
}));

type CanvasController = ReturnType<typeof useCanvasController>;

function buildController(overrides?: Partial<CanvasController>): CanvasController {
  const defaultDraftToolbarState: CanvasDraftToolbarState = {
    label: 'Draft synced',
    tone: 'neutral',
    showReloadAction: false,
  };

  return {
    dataSourceMode: 'mock',
    isBackendCheckPending: false,
    backendReady: true,
    backendBlockMessage: null,
    isLoadingGraph: false,
    graphErrorMessage: null,
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: true,
    explorerNodes: [
      {
        id: 'node.orders',
        name: 'orders',
        pluginId: 'dbt',
        kind: 'dbt:model',
        role: 'transform',
        status: 'idle',
        tags: [],
      },
    ],
    inspectorNode: null,
    activeRunId: null,
    registeredPlugins: new Set(['dbt']),
    userPermissions: {
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canManagePlugins: false,
      canManageRBAC: false,
    },
    canvasAuthoringMode: 'transformation',
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    viewport: null,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    handleNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    handleViewportChange: vi.fn(),
    handleNodeDragStop: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
    handleSourceImportComplete: vi.fn(),
    importedNodeFocusIds: [],
    handleImportedNodeFocusComplete: vi.fn(),
    hideExplorerPanel: vi.fn(),
    showExplorerPanel: vi.fn(),
    hideInspectorPanel: vi.fn(),
    showInspectorPanel: vi.fn(),
    handleAutoLayout: vi.fn(),
    handleToggleCostOverlay: vi.fn(),
    toggleImpactOverlay: vi.fn(),
    toggleColumnLevelLineage: vi.fn(),
    handlePlan: vi.fn(),
    handleStartRun: vi.fn(),
    draftSaveStatus: 'idle',
    draftRecoveryReason: null,
    draftToolbarState: defaultDraftToolbarState,
    draftConflictRevision: null,
    hasStaleDraftVersion: false,
    hasMissingRemoteDraft: false,
    hasDraftProjectionGap: false,
    reloadLatestDraft: vi.fn(),
    adoptCurrentWorkspaceSnapshot: vi.fn(),
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    transformationValidation: {
      valid: false,
      summaryCode: 'requires_three_nodes',
      draftSignature: 'draft',
      scopedNodeIds: [],
      scopedEdgeIds: [],
      nodeRolesById: {},
    },
    planModalOpen: false,
    setPlanModalOpen: vi.fn(),
    currentPlan: null,
    confirmEdgeModal: { open: false, edge: null },
    setConfirmEdgeModal: vi.fn(),
    confirmEdgeCreation: vi.fn(),
    ...overrides,
  };
}

async function renderCanvasRoute(root: Root): Promise<void> {
  const router = createMemoryRouter(
    [
      {
        id: 'dbt.canvas',
        path: '/canvas',
        handle: {
          routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
        },
        element: <Canvas />,
      },
    ],
    {
      initialEntries: ['/canvas'],
    }
  );

  await act(async () => {
    root.render(<RouterProvider router={router} />);
  });
}

describe('Canvas route', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockedUseCanvasController = vi.mocked(useCanvasController);

  beforeEach(() => {
    const topBarCanvasControls = document.createElement('div');
    topBarCanvasControls.id = 'shell-top-bar-canvas-controls';
    document.body.appendChild(topBarCanvasControls);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockedUseCanvasController.mockReset();
    canvasRouteState.explorerProps = null;
    resetCanvasDraftPresentationState();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    resetCanvasDraftPresentationState();
    resetRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION);
    document.getElementById('shell-top-bar-canvas-controls')?.remove();
    container.remove();
  });

  it('renders a governed loading state inside the canvas workbench', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        isLoadingGraph: true,
        explorerNodes: [],
      })
    );

    await renderCanvasRoute(root);

    expect(container.textContent).toContain('Loading canvas');
    expect(container.querySelector('[data-slot="canvas-loading-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'loading_graph',
      bootstrapStatus: 'pending',
      bootstrapDetail: 'Loading workspace graph for canvas',
      canCompleteBootstrap: false,
    });
    expect(
      getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toMatchObject({
      status: 'pending',
      detail: 'Loading workspace graph for canvas',
      canComplete: false,
    });
  });

  it('renders a governed empty state when the workspace graph has no nodes', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
      })
    );

    await renderCanvasRoute(root);

    expect(container.textContent).toContain('No graph content loaded');
    expect(container.querySelector('[data-slot="canvas-empty-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'empty',
      bootstrapStatus: 'complete',
      bootstrapDetail: 'Canvas is ready with no graph content yet',
      canCompleteBootstrap: true,
    });
    expect(
      getPublishedRouteBootstrapPresentation(CANVAS_ROUTE_BOOTSTRAP_REGISTRATION)
    ).toMatchObject({
      status: 'complete',
      detail: 'Canvas is ready with no graph content yet',
      canComplete: true,
    });
  });

  it('renders read-only empty guidance without suggesting Add data when edits are gated', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
        userPermissions: {
          canPlan: false,
          canRun: false,
          canEditEdges: false,
          canManagePlugins: false,
          canManageRBAC: false,
        },
      })
    );

    await renderCanvasRoute(root);

    expect(container.textContent).toContain('No graph content loaded');
    expect(container.textContent).toContain(
      'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.'
    );
    expect(container.textContent).not.toContain('Use Add data');
    expect(canvasRouteState.explorerProps?.onOpenDataRegistry).toBeUndefined();
  });

  it('renders a governed error state when the graph snapshot fails before any nodes are available', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
        graphErrorMessage: 'workspace graph unavailable',
      })
    );

    await renderCanvasRoute(root);

    expect(container.textContent).toContain('Canvas unavailable');
    expect(container.textContent).toContain('workspace graph unavailable');
    expect(container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'error_graph',
      bootstrapStatus: 'error',
      bootstrapDetail: 'workspace graph unavailable',
      canCompleteBootstrap: false,
    });
  });

  it('keeps the viewport visible and shows a read-only banner when mutations are gated', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        userPermissions: {
          canPlan: false,
          canRun: false,
          canEditEdges: false,
          canManagePlugins: false,
          canManageRBAC: false,
        },
      })
    );

    await renderCanvasRoute(root);

    const buttons = Array.from(container.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));

    expect(container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-readonly-state"]')).not.toBeNull();
    expect(container.textContent).toContain('Read-only canvas');
    expect(canvasRouteState.explorerProps).toMatchObject({
      canEditGraph: false,
    });
    expect(canvasRouteState.explorerProps?.onOpenDataRegistry).toBeUndefined();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('shows the missing-remote draft banner and disables canvas actions while keeping inspection visible', async () => {
    const reloadLatestDraft = vi.fn();
    const adoptCurrentWorkspaceSnapshot = vi.fn();
    mockedUseCanvasController.mockReturnValue(
      buildController({
        draftRecoveryReason: 'missing_remote',
        draftToolbarState: {
          label: 'Draft missing',
          tone: 'warning',
          showReloadAction: true,
        },
        reloadLatestDraft,
        adoptCurrentWorkspaceSnapshot,
      })
    );

    await renderCanvasRoute(root);

    const buttons = Array.from(container.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));
    const reloadButton = buttons.find((button) => button.textContent?.includes('Reload latest draft'));
    const adoptButton = buttons.find((button) =>
      button.textContent?.includes('Adopt current workspace snapshot')
    );

    expect(container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-missing-remote-draft-state"]')).not.toBeNull();
    expect(container.textContent).toContain('Persisted draft no longer exists');
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(reloadButton).not.toBeNull();
    expect(adoptButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);

    await act(async () => {
      adoptButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(adoptCurrentWorkspaceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('shows the stale-draft banner and disables canvas actions until reload recovers the draft', async () => {
    const reloadLatestDraft = vi.fn();
    mockedUseCanvasController.mockReturnValue(
      buildController({
        draftRecoveryReason: 'stale_conflict',
        draftToolbarState: {
          label: 'Stale version',
          tone: 'danger',
          showReloadAction: true,
        },
        reloadLatestDraft,
      })
    );

    await renderCanvasRoute(root);

    const buttons = Array.from(container.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));
    const reloadButton = buttons.find((button) => button.textContent?.includes('Reload latest draft'));

    expect(container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-stale-draft-state"]')).not.toBeNull();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(reloadButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('shows the projection-gap banner and pauses canvas actions until recovery resolves it', async () => {
    const reloadLatestDraft = vi.fn();
    const adoptCurrentWorkspaceSnapshot = vi.fn();
    mockedUseCanvasController.mockReturnValue(
      buildController({
        draftRecoveryReason: 'projection_gap',
        draftToolbarState: {
          label: 'Projection gap',
          tone: 'warning',
          showReloadAction: true,
        },
        reloadLatestDraft,
        adoptCurrentWorkspaceSnapshot,
      })
    );

    await renderCanvasRoute(root);

    const buttons = Array.from(container.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));
    const reloadButton = buttons.find((button) => button.textContent?.includes('Reload latest draft'));
    const adoptButton = buttons.find((button) =>
      button.textContent?.includes('Adopt current workspace snapshot')
    );

    expect(container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-draft-projection-gap-state"]')).not.toBeNull();
    expect(container.textContent).toContain(
      'Persisted draft is ahead of the current graph snapshot'
    );
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);

    await act(async () => {
      adoptButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(adoptCurrentWorkspaceSnapshot).toHaveBeenCalledTimes(1);
  });

  it('blocks the canvas surface in api mode when backend readiness is not satisfied', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        dataSourceMode: 'api',
        backendReady: false,
        backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
      })
    );

    await renderCanvasRoute(root);

    const buttons = Array.from(container.querySelectorAll('button'));
    const layoutButton = buttons.find((button) => button.textContent?.includes('Layout'));
    const planButton = buttons.find((button) => button.textContent?.includes('Plan'));
    const runButton = buttons.find((button) => button.textContent?.includes('Run'));

    expect(container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
    expect(container.textContent).toContain('Backend not ready');
    expect(container.textContent).toContain('Readiness not satisfied: database_not_configured.');
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'blocked_backend',
      bootstrapStatus: 'blocked',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: false,
    });
  });

  it('prioritizes backend blocked route state over draft recovery banners', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        dataSourceMode: 'api',
        backendReady: false,
        backendBlockMessage: 'Readiness not satisfied: database_not_configured.',
        draftRecoveryReason: 'missing_remote',
        draftToolbarState: {
          label: 'Draft missing',
          tone: 'warning',
          showReloadAction: true,
        },
      })
    );

    await renderCanvasRoute(root);

    expect(container.querySelector('[data-slot="canvas-blocked-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-missing-remote-draft-state"]')).toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'blocked_backend',
      bootstrapStatus: 'blocked',
      bootstrapDetail: 'Readiness not satisfied: database_not_configured.',
      canCompleteBootstrap: false,
    });
  });

  it('prioritizes graph error route state over draft recovery banners', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
        graphErrorMessage: 'workspace graph unavailable',
        draftRecoveryReason: 'stale_conflict',
        draftToolbarState: {
          label: 'Stale version',
          tone: 'danger',
          showReloadAction: true,
        },
      })
    );

    await renderCanvasRoute(root);

    expect(container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-stale-draft-state"]')).toBeNull();
    expect(getCanvasDraftPresentationState()).toMatchObject({
      routeState: 'error_graph',
      bootstrapStatus: 'error',
      bootstrapDetail: 'workspace graph unavailable',
      canCompleteBootstrap: false,
    });
  });
});
