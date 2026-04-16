// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasShell from './CanvasShell';
import { DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = vi.hoisted(() => ({
  dbtExplorerProps: null as null | Record<string, unknown>,
  canvasViewportProps: null as null | Record<string, unknown>,
  sourceImportWizardProps: null as null | Record<string, unknown>,
}));

vi.mock('../../components/DbtExplorer', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.dbtExplorerProps = props;
    return <div data-testid="dbt-explorer" />;
  },
}));

vi.mock('../../components/InspectorPanel', () => ({
  default: () => <div data-testid="inspector-panel" />,
}));

vi.mock('../../components/SourceImportWizard', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.sourceImportWizardProps = props;
    return <div data-testid="source-import-wizard" />;
  },
}));

vi.mock('./CanvasToolbar', () => ({
  default: () => <div data-testid="canvas-toolbar" />,
}));

vi.mock('./CanvasViewport', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.canvasViewportProps = props;
    return <div data-testid="canvas-viewport" />;
  },
}));

function buildProps(overrides?: Partial<CanvasShellProps>): CanvasShellProps {
  return {
    focusMode: false,
    explorerPanelVisible: true,
    inspectorPanelVisible: false,
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
    },
    nodesWithImpact: [],
    edges: [],
    nodeTypes: {},
    gridSize: 24,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
    viewport: null,
    onNodesChange: vi.fn(),
    onNodeDragStop: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onNodeClick: vi.fn(),
    onSelectionChange: vi.fn(),
    onViewportChange: vi.fn(),
    onDrop: vi.fn(),
    onDragOver: vi.fn(),
    onSourceImportComplete: vi.fn(),
    importedNodeFocusIds: [],
    onImportedNodeFocusComplete: vi.fn(),
    onHideExplorer: vi.fn(),
    onShowExplorer: vi.fn(),
    onHideInspector: vi.fn(),
    onShowInspector: vi.fn(),
    onAutoLayout: vi.fn(),
    onToggleCostOverlay: vi.fn(),
    onToggleImpact: vi.fn(),
    onToggleColumns: vi.fn(),
    onReloadLatestDraft: vi.fn(),
    onPlan: vi.fn(),
    onRun: vi.fn(),
    draftSaveStatus: 'idle',
    hasStaleDraftVersion: false,
    canStartRun: false,
    planStatusSummary: 'Preview required before running.',
    exclusiveOverlayMode: 'runtime',
    canUseCostOverlay: false,
    impactOverlayEnabled: false,
    columnLevelLineageEnabled: false,
    canvasAuthoringMode: 'transformation',
    transformationValidation: {
      valid: false,
      summary: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
      draftSignature: 'draft',
      scopedNodeIds: [],
      scopedEdgeIds: [],
      nodeRolesById: {},
    },
    centerSurface: undefined,
    readOnlyBanner: undefined,
    ...overrides,
  };
}

describe('CanvasShell', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    shellState.dbtExplorerProps = null;
    shellState.canvasViewportProps = null;
    shellState.sourceImportWizardProps = null;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('passes read-only explorer props when graph edits are gated', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            userPermissions: {
              canPlan: false,
              canRun: false,
              canEditEdges: false,
            },
          })}
        />
      );
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      canEditGraph: false,
    });
    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeUndefined();
  });

  it('keeps explorer import affordances wired when graph edits are allowed', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      canEditGraph: true,
    });
    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeTypeOf('function');
  });

  it('wires source import completion and imported-node focus through the shell surfaces', async () => {
    const props = buildProps({
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
    });

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      onImportedNodeFocusComplete: props.onImportedNodeFocusComplete,
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      onComplete: props.onSourceImportComplete,
    });
  });
});
