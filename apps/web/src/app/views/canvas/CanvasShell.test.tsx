// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contract rendering and command propagation. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasShell from './CanvasShell';
import { buildCanvasWorkspaceResourceGroups } from '../../components/canvasWorkspaceExplorerModel';
import { DEFAULT_CANVAS_GRID_COLOR, DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import type {
  CanvasShellChromeCommands,
  CanvasShellCanvasCommands,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellPanels,
  CanvasShellProps,
  CanvasShellToolbar,
} from './canvasShell.types';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';
import type { IWarehouseSourceImportPort } from '../../ports/workspace';

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
  default: (props: { variant?: string }) => (
    <div data-testid="canvas-toolbar" data-variant={props.variant ?? 'standalone'} />
  ),
}));

vi.mock('./CanvasViewport', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.canvasViewportProps = props;
    return <div data-testid="canvas-viewport" />;
  },
}));

type CanvasShellPropsOverrides = {
  layout?: Partial<CanvasShellLayout>;
  panels?: Partial<CanvasShellPanels>;
  graph?: Partial<CanvasShellGraph>;
  toolbar?: Partial<CanvasShellToolbar>;
  graphCommands?: Partial<CanvasShellGraphCommands>;
  chromeCommands?: Partial<CanvasShellChromeCommands>;
  canvasCommands?: Partial<CanvasShellCanvasCommands>;
  warehouseSourceImport?: IWarehouseSourceImportPort;
};

function buildPlanRunReadiness(
  overrides?: Partial<PlanRunReadinessReadModel>
): PlanRunReadinessReadModel {
  return {
    blockers: ['plan_integrity'],
    rail: 'ObservePlanRunReadiness',
    status: 'blocked',
    summary: canvasViewCopy.planStatusPreviewRequiredMessage,
    ...overrides,
  };
}

function buildProps(overrides?: CanvasShellPropsOverrides): CanvasShellProps {
  const defaultDraftToolbarState: CanvasDraftToolbarState = {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  };

  const explorerNodes = [
    {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
  ] satisfies CanvasShellPanels['inspectorGraphNodes'];

  return {
    layout: {
      focusMode: false,
      explorerPanelVisible: true,
      inspectorPanelVisible: false,
      canOpenSourceImport: true,
      hostTabState: {
        activeTabId: null,
        tabs: [],
      },
      centerSurfaceMode: 'replace',
      centerSurface: undefined,
      readOnlyBanner: undefined,
      ...overrides?.layout,
    },
    panels: {
      explorerResourceGroups: buildCanvasWorkspaceResourceGroups({ nodes: explorerNodes }),
      authoringNodeKinds: [buildTestNodeKind()],
      activeCanvasId: null,
      activeCanvas: null,
      canvasDocuments: [],
      executionEnvironmentOptions: [{ value: 'dev', label: 'dev' }],
      canEditCanvas: true,
      canDeleteActiveCanvas: false,
      inspectorNode: null,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      inspectorAuthoring: {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      activeRunId: null,
      registeredPlugins: new Set(['dbt']),
      runtimeCapabilities: undefined,
      userPermissions: {
        canPlan: true,
        canRun: true,
        canEditEdges: true,
      },
      importedNodeFocusIds: [],
      ...overrides?.panels,
    },
    graph: {
      nodesWithImpact: [],
      edges: [],
      nodeTypes: {},
      gridSize: 24,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
      canvasGridVisible: true,
      canvasGridColor: DEFAULT_CANVAS_GRID_COLOR,
      canvasSnapToGrid: false,
      canvasEmptyStateGuideVisible: true,
      viewport: null,
      ...overrides?.graph,
    },
    toolbar: {
      canvasAuthoringMode: 'transformation',
      routeState: 'ready',
      draftToolbarState: defaultDraftToolbarState,
      canPlanGraph: false,
      canStartRun: false,
      canExportProjectSnapshot: true,
      canImportProjectSnapshot: true,
      planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
      planRunReadiness: buildPlanRunReadiness(),
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
      ...overrides?.toolbar,
    },
    graphCommands: {
      onNodesChange: vi.fn(),
      onNodeDrag: vi.fn(),
      onNodeDragStop: vi.fn(),
      onEdgesChange: vi.fn(),
      onConnect: vi.fn(),
      onReconnect: vi.fn(),
      onNodeClick: vi.fn(),
      onSelectionChange: vi.fn(),
      onViewportChange: vi.fn(),
      onDrop: vi.fn(),
      onDragOver: vi.fn(),
      onCreateAuthoringNode: vi.fn(),
      onSourceImportComplete: vi.fn(),
      onImportedNodeFocusComplete: vi.fn(),
      ...overrides?.graphCommands,
    },
    chromeCommands: {
      onHideExplorer: vi.fn(),
      onShowExplorer: vi.fn(),
      onHideInspector: vi.fn(),
      onShowInspector: vi.fn(),
      onAutoLayout: vi.fn(),
      onToggleCostOverlay: vi.fn(),
      onToggleImpact: vi.fn(),
      onToggleColumns: vi.fn(),
      onToggleGridVisible: vi.fn(),
      onGridColorChange: vi.fn(),
      onToggleSnapToGrid: vi.fn(),
      onSetCanvasEmptyStateGuideVisible: vi.fn(),
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onReloadLatestDraft: vi.fn(),
      onPlan: vi.fn(),
      onRun: vi.fn(),
      ...overrides?.chromeCommands,
    },
    canvasCommands: {
      onSelectCanvas: vi.fn(),
      onApplyCanvasPatch: vi.fn(),
      onDeleteActiveCanvas: vi.fn(),
      ...overrides?.canvasCommands,
    },
    warehouseSourceImport: overrides?.warehouseSourceImport,
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

  it('renders host-owned tab chrome when the layout exposes an authoritative canvas tab', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              hostTabState: {
                activeTabId: 'workspace-draft-canvas',
                tabs: [
                  {
                    id: 'workspace-draft-canvas',
                    title: 'Transformation canvas',
                    kind: 'transformation',
                    kindLabel: 'Transformation',
                    source: 'workspace_draft',
                  },
                ],
              },
              hostTabStrip: <div data-testid="canvas-host-tab-strip" />,
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).not.toBeNull();
  });

  it('collapses canvas identity, workbench tabs, and route commands into one workbench chrome row', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              hostTabStrip: <div data-testid="canvas-host-tab-strip" />,
              workbenchTabStrip: <div data-testid="canvas-workbench-tab-strip" />,
            },
          })}
        />
      );
    });

    const chrome = container.querySelector('[data-slot="canvas-workbench-chrome"]');
    const hostTabStrip = container.querySelector('[data-testid="canvas-host-tab-strip"]');
    const workbenchTabStrip = container.querySelector('[data-testid="canvas-workbench-tab-strip"]');
    const canvasToolbar = container.querySelector('[data-testid="canvas-toolbar"]');

    expect(chrome).not.toBeNull();
    expect(hostTabStrip).not.toBeNull();
    expect(workbenchTabStrip).not.toBeNull();
    expect(canvasToolbar).not.toBeNull();
    expect(chrome?.contains(hostTabStrip)).toBe(true);
    expect(chrome?.contains(workbenchTabStrip)).toBe(true);
    expect(chrome?.contains(canvasToolbar)).toBe(true);
    expect(chrome?.getAttribute('class')).toContain('overflow-x-auto');
    expect(chrome?.getAttribute('class')).not.toContain('flex-wrap');
    expect(canvasToolbar?.getAttribute('data-variant')).toBe('inline');
  });

  it('keeps the graph workbench at a stable minimum width instead of crushing panels on narrow viewports', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('class')).toContain('min-w-[960px]');
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            toolbar: {
              routeState: 'needs_canvas',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
  });

  it('keeps governed center surfaces ahead of workbench unavailable panels', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              centerSurfaceMode: 'replace',
              centerSurface: <div data-testid="first-canvas-center-surface" />,
              workbenchTabPanel: <div data-testid="code-workbench-panel" />,
            },
            toolbar: {
              routeState: 'needs_canvas',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).toBeNull();
  });

  it('keeps explorer import affordances wired when graph edits are allowed', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      canEditGraph: true,
    });
    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeTypeOf('function');
    expect(shellState.sourceImportWizardProps).toMatchObject({
      sourceImportOptions: [
        expect.objectContaining({ id: 'includeColumns' }),
        expect.objectContaining({ id: 'addTests' }),
        expect.objectContaining({ id: 'addFreshness' }),
      ],
    });
  });

  it('keeps ready-canvas node creation out of the explorer contract', async () => {
    const props = buildProps();

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      resourceGroups: props.panels.explorerResourceGroups,
      canEditGraph: true,
    });
    expect(shellState.dbtExplorerProps).not.toHaveProperty('nodeKinds');
    expect(shellState.dbtExplorerProps).not.toHaveProperty('authoringNodeKinds');
    expect(shellState.dbtExplorerProps).not.toHaveProperty('onCreateAuthoringNode');
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

  it('hides explorer import affordances when the dbt source import plugin is unavailable', async () => {
    const props = buildProps({
      panels: {
        runtimeCapabilities: {
          plugins: {
            dbt: {
              available: false,
              reason: 'disabled in test',
            },
          },
        },
      },
    });

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      canEditGraph: true,
    });
    expect(shellState.dbtExplorerProps?.onOpenDataRegistry).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      sourceImportOptions: [],
    });
  });

  it('wires source import completion and imported-node focus through the shell surfaces', async () => {
    const props = buildProps({
      panels: {
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

  it('hands explorer-selected warehouse tables into the source import wizard', async () => {
    const warehouseSourceImport = {
      listWarehouseConnections: vi.fn(),
      listWarehouseTables: vi.fn(),
      createWarehouseConnection: vi.fn(),
      testWarehouseConnection: vi.fn(),
      importSources: vi.fn(),
    } satisfies IWarehouseSourceImportPort;
    const initialSelection = {
      connectionId: 'conn-1',
      tables: [
        {
          database: 'RAW',
          schema: 'ERP',
          table: 'CUSTOMERS',
          rowCount: 45000,
        },
      ],
    };

    await act(async () => {
      root.render(<CanvasShell {...buildProps({ warehouseSourceImport })} />);
    });

    expect(shellState.dbtExplorerProps).toMatchObject({
      warehouseSourceImport,
    });

    await act(async () => {
      const openDataRegistry = shellState.dbtExplorerProps?.onOpenDataRegistry as
        | ((selection?: typeof initialSelection) => void)
        | undefined;
      openDataRegistry?.(initialSelection);
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      initialSelection,
    });
  });

  it('renders a DVT flow guide with source columns, SQL, and destination before planning', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              inspectorGraphNodes: [
                {
                  id: 'src-orders',
                  name: 'ERP Orders',
                  pluginId: 'dvt.warehouse-source',
                  kind: 'dvt:source',
                  role: 'input',
                  status: 'idle',
                  tags: [],
                  metadata: {
                    schema: 'raw',
                    tableName: 'orders',
                    rowCount: 125000,
                    columns: [
                      { name: 'order_id', type: 'INTEGER', nullable: false },
                      { name: 'customer_id', type: 'INTEGER', nullable: false },
                      { name: 'amount', type: 'NUMERIC', nullable: true },
                    ],
                  },
                },
                {
                  id: 'tx-orders',
                  name: 'Clean Orders',
                  pluginId: 'dvt',
                  kind: 'dvt:sql_transform',
                  role: 'transform',
                  status: 'idle',
                  tags: [],
                  metadata: {
                    sql: 'select order_id, customer_id, amount from raw.orders',
                  },
                },
                {
                  id: 'sink-orders',
                  name: 'Order Summary',
                  pluginId: 'dvt',
                  kind: 'dvt:sink',
                  role: 'output',
                  status: 'idle',
                  tags: [],
                  metadata: {
                    config: {
                      schema: 'mart',
                      table: 'order_summary',
                      materialization: 'view',
                      writeMode: 'replace',
                    },
                  },
                },
              ],
              inspectorGraphEdges: [
                {
                  id: 'e1',
                  sourceId: 'src-orders',
                  targetId: 'tx-orders',
                  relation: 'lineage',
                },
                {
                  id: 'e2',
                  sourceId: 'tx-orders',
                  targetId: 'sink-orders',
                  relation: 'lineage',
                },
              ],
            },
            toolbar: {
              canPlanGraph: true,
              transformationValidation: {
                valid: true,
                summaryCode: 'valid',
                draftSignature: 'dvt-flow-ready',
                scopedNodeIds: ['src-orders', 'tx-orders', 'sink-orders'],
                scopedEdgeIds: ['e1', 'e2'],
                nodeRolesById: {
                  'src-orders': 'source',
                  'tx-orders': 'sql_transform',
                  'sink-orders': 'sink',
                },
              },
            },
          })}
        />
      );
    });

    const guide = container.querySelector('[data-slot="canvas-dvt-flow-guide"]');

    expect(guide).not.toBeNull();
    expect(guide?.textContent).toContain('Professional DVT flow');
    expect(guide?.textContent).toContain('Ready to preview');
    expect(guide?.textContent).toContain('raw.orders');
    expect(guide?.textContent).toContain('125,000 rows');
    expect(guide?.textContent).toContain('3 columns');
    expect(guide?.textContent).toContain('order_id INTEGER required');
    expect(guide?.textContent).toContain('select order_id, customer_id, amount from raw.orders');
    expect(guide?.textContent).toContain('mart.order_summary');
    expect(guide?.textContent).toContain('view');
    expect(guide?.textContent).toContain('replace');
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
