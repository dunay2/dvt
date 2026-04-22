// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasShell from './CanvasShell';
import { DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
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

type CanvasShellPropsOverrides = {
  layout?: Partial<CanvasShellProps['layout']>;
  panels?: Partial<CanvasShellProps['panels']>;
  graph?: Partial<CanvasShellProps['graph']>;
  graphCommands?: Partial<CanvasShellProps['graphCommands']>;
  chromeCommands?: Partial<CanvasShellProps['chromeCommands']>;
  toolbar?: Partial<CanvasShellProps['toolbar']>;
  centerSurface?: CanvasShellProps['centerSurface'];
  readOnlyBanner?: CanvasShellProps['readOnlyBanner'];
};

function buildProps(overrides?: CanvasShellPropsOverrides): CanvasShellProps {
  const defaultDraftToolbarState: CanvasDraftToolbarState = {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  };

  const baseProps: CanvasShellProps = {
    layout: {
      focusMode: false,
      explorerPanelVisible: true,
      inspectorPanelVisible: false,
      canOpenSourceImport: true,
    },
    panels: {
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
    },
    graph: {
      canvasAuthoringMode: 'transformation',
      nodesWithImpact: [],
      edges: [],
      nodeTypes: {},
      gridSize: 24,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
      viewport: null,
    },
    graphCommands: {
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
    },
    chromeCommands: {
      onHideExplorer: vi.fn(),
      onShowExplorer: vi.fn(),
      onHideInspector: vi.fn(),
      onShowInspector: vi.fn(),
    },
    toolbar: {
      onAutoLayout: vi.fn(),
      onToggleCostOverlay: vi.fn(),
      onToggleImpact: vi.fn(),
      onToggleColumns: vi.fn(),
      onReloadLatestDraft: vi.fn(),
      onPlan: vi.fn(),
      onRun: vi.fn(),
      draftToolbarState: defaultDraftToolbarState,
      canStartRun: false,
      planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
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
    },
    centerSurface: undefined,
    readOnlyBanner: undefined,
  };

  return {
    layout: {
      ...baseProps.layout,
      ...overrides?.layout,
    },
    panels: {
      ...baseProps.panels,
      ...overrides?.panels,
    },
    graph: {
      ...baseProps.graph,
      ...overrides?.graph,
    },
    graphCommands: {
      ...baseProps.graphCommands,
      ...overrides?.graphCommands,
    },
    chromeCommands: {
      ...baseProps.chromeCommands,
      ...overrides?.chromeCommands,
    },
    toolbar: {
      ...baseProps.toolbar,
      ...overrides?.toolbar,
    },
    centerSurface: overrides?.centerSurface ?? baseProps.centerSurface,
    readOnlyBanner: overrides?.readOnlyBanner ?? baseProps.readOnlyBanner,
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
            panels: {
              userPermissions: {
                canPlan: false,
                canRun: false,
                canEditEdges: false,
              },
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

  it('hides explorer import affordances when source import is unavailable', async () => {
    const props = buildProps({
      layout: {
        canOpenSourceImport: false,
      },
    });

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      canEditGraph: true,
    });
    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeUndefined();
  });

  it('wires source import completion and imported-node focus through the shell surfaces', async () => {
    const props = buildProps({
      graphCommands: {
        importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      },
    });

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      importedNodeFocusIds: ['src_erp_orders', 'src_erp_customers'],
      onImportedNodeFocusComplete: props.graphCommands.onImportedNodeFocusComplete,
    });
    expect(shellState.sourceImportWizardProps).toMatchObject({
      onComplete: props.graphCommands.onSourceImportComplete,
    });
  });

  it('closes the import wizard if edit permissions are revoked while it is open', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    await act(async () => {
      const openDataRegistry = shellState.dbtExplorerProps?.onOpenDataRegistry as
        | (() => void)
        | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
    });

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              userPermissions: {
                canPlan: false,
                canRun: false,
                canEditEdges: false,
              },
            },
          })}
        />
      );
    });

    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: false,
    });
  });
});
