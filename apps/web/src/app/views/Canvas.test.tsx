// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Canvas from './Canvas';
import { useCanvasController } from './canvas/useCanvasController';

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./canvas/useCanvasController', () => ({
  useCanvasController: vi.fn(),
}));

vi.mock('../components/DbtExplorer', () => ({
  default: () => <div data-slot="canvas-explorer-panel">Explorer</div>,
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
  return {
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
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    transformationValidation: {
      valid: false,
      summary: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
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

describe('Canvas route', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockedUseCanvasController = vi.mocked(useCanvasController);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    mockedUseCanvasController.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders a governed loading state inside the canvas workbench', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        isLoadingGraph: true,
        explorerNodes: [],
      })
    );

    await act(async () => {
      root.render(<Canvas />);
    });

    expect(container.textContent).toContain('Graph Tools');
    expect(container.textContent).toContain('Loading canvas');
    expect(container.querySelector('[data-slot="canvas-loading-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
  });

  it('renders a governed empty state when the workspace graph has no nodes', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
      })
    );

    await act(async () => {
      root.render(<Canvas />);
    });

    expect(container.textContent).toContain('No graph content loaded');
    expect(container.querySelector('[data-slot="canvas-empty-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
  });

  it('renders a governed error state when the graph snapshot fails before any nodes are available', async () => {
    mockedUseCanvasController.mockReturnValue(
      buildController({
        explorerNodes: [],
        graphErrorMessage: 'workspace graph unavailable',
      })
    );

    await act(async () => {
      root.render(<Canvas />);
    });

    expect(container.textContent).toContain('Canvas unavailable');
    expect(container.textContent).toContain('workspace graph unavailable');
    expect(container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-viewport"]')).toBeNull();
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

    await act(async () => {
      root.render(<Canvas />);
    });

    expect(container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-readonly-state"]')).not.toBeNull();
    expect(container.textContent).toContain('Read-only canvas');
  });
});
