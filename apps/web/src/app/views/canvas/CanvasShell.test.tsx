// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contract rendering and command propagation. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CanvasShell from './CanvasShell';
import { DEFAULT_CANVAS_GRID_COLOR, DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import type {
  CanvasShellChromeCommands,
  CanvasShellCanvasCommands,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellPanels,
  CanvasShellProps,
  CanvasShellChromeState,
} from './canvasShell.types';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';
import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';

const shellState = vi.hoisted(() => ({
  canvasViewportProps: null as null | Record<string, unknown>,
  sourceImportWizardProps: null as null | Record<string, unknown>,
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
  chromeState?: Partial<CanvasShellChromeState>;
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
  const defaultDraftStatusState: CanvasDraftStatusState = {
    label: canvasViewCopy.draftSyncedLabel,
    tone: 'neutral',
    showReloadAction: false,
  };

  return {
    layout: {
      focusMode: false,
      inspectorPanelVisible: false,
      canOpenSourceImport: true,
      surfaceStrategy: dvtCanvasSurfaceStrategy,
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
      authoringNodeKinds: [buildTestNodeKind()],
      activeCanvasId: null,
      activeCanvas: null,
      canvasDocuments: [],
      executionEnvironmentOptions: [{ value: 'dev', label: 'dev' }],
      canEditCanvas: true,
      canDeleteActiveCanvas: false,
      inspectorNode: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
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
    chromeState: {
      canvasAuthoringMode: 'transformation',
      routeState: 'ready',
      draftStatusState: defaultDraftStatusState,
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
      ...overrides?.chromeState,
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
    shellState.canvasViewportProps = null;
    shellState.sourceImportWizardProps = null;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useOperationalDrawerContributionStore.setState({ contribution: null });
    container.remove();
    vi.clearAllMocks();
  });

  it('does not mount a fixed explorer rail when graph edits are gated', async () => {
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

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
  });

  it('renders node details as a contextual overlay only when a node is selected', async () => {
    const selectedNode = {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    } satisfies CanvasShellPanels['inspectorNode'];

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              inspectorPanelVisible: true,
            },
            panels: {
              inspectorNode: selectedNode,
              inspectorGraphNodes: [selectedNode],
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inspector-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps node selection separate from contextual node workbench opening', async () => {
    const onShowInspector = vi.fn();
    const onNodeClick = vi.fn();
    const clickedNode = { id: 'node.orders' } as Parameters<
      CanvasShellGraphCommands['onNodeClick']
    >[1];
    const clickEvent = new MouseEvent('click') as unknown as Parameters<
      CanvasShellGraphCommands['onNodeClick']
    >[0];

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeCommands: { onShowInspector },
            graphCommands: { onNodeClick },
          })}
        />
      );
    });

    const viewportNodeClick = shellState.canvasViewportProps
      ?.onNodeClick as CanvasShellGraphCommands['onNodeClick'];

    viewportNodeClick(clickEvent, clickedNode);

    expect(onShowInspector).not.toHaveBeenCalled();
    expect(onNodeClick).toHaveBeenCalledWith(clickEvent, clickedNode);
  });

  it('keeps host-owned tab chrome out of the graph base panel', async () => {
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

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
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

    expect(chrome).toBeNull();
    expect(hostTabStrip).toBeNull();
    expect(workbenchTabStrip).toBeNull();
    expect(canvasToolbar).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('registers Canvas operational drawer tabs from the surface strategy', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeRunId: 'run-42',
            },
          })}
        />
      );
    });

    const contribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(contribution).toMatchObject({
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [
        { id: 'log', label: 'Log' },
        { id: 'problems', label: 'Problems' },
        { id: 'runs', label: 'Runs' },
        { id: 'preview', label: 'Preview' },
      ],
      runs: {
        activeRunId: 'run-42',
      },
      preview: {
        status: 'blocked',
        summary: canvasViewCopy.planStatusPreviewRequiredMessage,
      },
    });
    expect(contribution?.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        message: canvasViewCopy.planStatusPreviewRequiredMessage,
      }),
    ]);
  });

  it('keeps neutral canvas identity and draft status out of the graph surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
    expect(container.textContent).not.toContain('Sales canvas');
    expect(container.textContent).not.toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('renders actionable draft recovery status as a graph overlay', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
            chromeState: {
              draftStatusState: {
                label: canvasViewCopy.draftSaveFailedLabel,
                tone: 'danger',
                showReloadAction: true,
              },
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    const draftStatus = container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain(canvasViewCopy.draftSaveFailedLabel);
  });

  it('keeps pending autosave status visible on the graph surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
            chromeState: {
              draftStatusState: {
                label: canvasViewCopy.savingDraftLabel,
                tone: 'neutral',
                showReloadAction: false,
              },
            },
          })}
        />
      );
    });

    const draftStatus = container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain(canvasViewCopy.savingDraftLabel);
  });

  it('keeps the graph workbench fluid instead of forcing horizontal overflow on narrow viewports', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('class')).toContain('min-w-0');
    expect(shellPanelGroup?.getAttribute('class')).not.toContain('min-w-[960px]');
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeState: {
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
            chromeState: {
              routeState: 'needs_canvas',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).toBeNull();
  });

  it('wires source import as a contextual viewport command when graph edits are allowed', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: true,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');
    expect(shellState.sourceImportWizardProps).toMatchObject({
      sourceImportOptions: [
        expect.objectContaining({ id: 'includeColumns' }),
        expect.objectContaining({ id: 'addTests' }),
        expect.objectContaining({ id: 'addFreshness' }),
      ],
    });
  });

  it('keeps ready-canvas node creation in the viewport context contract instead of a rail', async () => {
    const props = buildProps();

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      authoringNodeKinds: props.panels.authoringNodeKinds,
      onCreateAuthoringNode: props.graphCommands.onCreateAuthoringNode,
    });
  });

  it('hides viewport source import affordances when source import is unavailable', async () => {
    const props = buildProps({
      layout: {
        canOpenSourceImport: false,
      },
    });

    await act(async () => {
      root.render(<CanvasShell {...props} />);
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
  });

  it('hides viewport source import affordances when the dbt source import plugin is unavailable', async () => {
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

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
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

  it('opens the source import wizard from the viewport contextual source command', async () => {
    const warehouseSourceImport = {
      listWarehouseConnections: vi.fn(),
      listWarehouseTables: vi.fn(),
      createWarehouseConnection: vi.fn(),
      testWarehouseConnection: vi.fn(),
      importSources: vi.fn(),
    } satisfies IWarehouseSourceImportPort;

    await act(async () => {
      root.render(<CanvasShell {...buildProps({ warehouseSourceImport })} />);
    });

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeTypeOf('function');

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
        | (() => void)
        | undefined;
      openDataRegistry?.();
    });

    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: true,
      initialSelection: undefined,
    });
  });

  it('opens a contextual project explorer from the viewport command using real canvas documents', async () => {
    const onSelectCanvas = vi.fn();

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvasId: 'sales-canvas',
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
              canvasDocuments: [
                {
                  id: 'sales-canvas',
                  title: 'Sales canvas',
                  kind: 'dbt',
                  environmentId: 'dev',
                },
                {
                  id: 'dvt-flow',
                  title: 'DVT flow',
                  kind: 'transformation',
                  environmentId: 'dev',
                },
              ],
            },
            canvasCommands: {
              onSelectCanvas,
            },
          })}
        />
      );
    });

    await act(async () => {
      const openProjectExplorer = shellState.canvasViewportProps?.onOpenProjectExplorer as
        | (() => void)
        | undefined;
      openProjectExplorer?.();
    });

    expect(container.querySelector('[data-slot="canvas-project-explorer-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Sales canvas');
    expect(container.textContent).toContain('DVT flow');

    const dvtFlowButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Open DVT flow'
    );
    expect(dvtFlowButton).toBeDefined();

    await act(async () => {
      dvtFlowButton?.click();
    });

    expect(onSelectCanvas).toHaveBeenCalledWith('dvt-flow');
  });

  it('opens contextual canvas settings from the viewport command using view commands', async () => {
    const onToggleGridVisible = vi.fn();
    const onToggleSnapToGrid = vi.fn();

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeCommands: {
              onToggleGridVisible,
              onToggleSnapToGrid,
            },
          })}
        />
      );
    });

    await act(async () => {
      const openCanvasSettings = shellState.canvasViewportProps?.onOpenCanvasSettings as
        | (() => void)
        | undefined;
      openCanvasSettings?.();
    });

    expect(container.querySelector('[data-slot="canvas-settings-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Canvas settings');

    const gridButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Hide grid'
    );
    const snapButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Enable snap'
    );
    expect(gridButton).toBeDefined();
    expect(snapButton).toBeDefined();

    await act(async () => {
      gridButton?.click();
      snapButton?.click();
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
  });

  it('does not render the legacy DVT flow guide over the graph base surface', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    expect(container.querySelector('[data-slot="canvas-dvt-flow-guide"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('hides the DVT flow guide when a workbench tab panel replaces the graph viewport', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              workbenchTabPanel: <div data-testid="code-workbench-panel" />,
            },
            chromeState: {
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

    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-dvt-flow-guide"]')).toBeNull();
  });

  it('does not render the legacy DBT flow guide over the graph base surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeState: {
              canvasAuthoringMode: 'dbt',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-dbt-flow-guide"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps DBT graph details out of a synthetic guide when model SQL is unavailable', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            graph: {
              nodesWithImpact: [
                {
                  id: 'src-raw-orders',
                  type: 'dbtNode',
                  position: { x: 0, y: 0 },
                  data: {
                    name: 'Raw Orders',
                    pluginKind: 'dbt:source',
                    role: 'input',
                    status: 'idle',
                    tags: [],
                    metadata: {
                      dbt: {
                        sourceName: 'raw',
                        schemaName: 'erp',
                        tableName: 'orders',
                      },
                    },
                  },
                },
                {
                  id: 'model-fct-orders',
                  type: 'dbtNode',
                  position: { x: 260, y: 0 },
                  data: {
                    name: 'fct_orders',
                    pluginKind: 'dbt:model',
                    role: 'transform',
                    status: 'idle',
                    tags: [],
                    metadata: {
                      config: {
                        materialized: 'view',
                      },
                    },
                  },
                },
              ],
              edges: [{ id: 'source-model', source: 'src-raw-orders', target: 'model-fct-orders' }],
            },
            chromeState: {
              canvasAuthoringMode: 'dbt',
              canPlanGraph: false,
              canStartRun: false,
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-dbt-flow-guide"]')).toBeNull();
    expect(container.textContent).not.toContain('SQL missing');
    expect(container.textContent).not.toContain('select * from {{ source("raw", "orders") }}');
  });

  it('closes the import wizard if edit permissions are revoked while it is open', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    await act(async () => {
      const openDataRegistry = shellState.canvasViewportProps?.onOpenSourceImport as
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

    expect(shellState.canvasViewportProps?.onOpenSourceImport).toBeUndefined();
    expect(shellState.sourceImportWizardProps).toMatchObject({
      open: false,
    });
  });
});
