import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import CanvasShell from './CanvasShell';
import { DEFAULT_CANVAS_GRID_COLOR, DEFAULT_CANVAS_PALETTE_ID } from './canvasPalette';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';
import type {
  CanvasShellCanvasCommands,
  CanvasShellChromeCommands,
  CanvasShellChromeState,
  CanvasShellGraph,
  CanvasShellGraphCommands,
  CanvasShellLayout,
  CanvasShellPanels,
  CanvasShellProps,
  CanvasShellWorkspaceCommands,
} from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type {
  IWarehouseSourceDataSampleQueryPort,
  IWarehouseSourceImportPort,
} from '../../ports/workspace';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';

const shellState = vi.hoisted(() => ({
  canvasViewportProps: null as null | Record<string, unknown>,
  sourceImportWizardProps: null as null | Record<string, unknown>,
  dbtProjectImportDialogProps: null as null | Record<string, unknown>,
}));

vi.mock('../../components/SourceImportWizard', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.sourceImportWizardProps = props;
    return <div data-testid="source-import-wizard" />;
  },
}));

vi.mock('../../components/dbtProjectImport/DbtProjectImportDialog', () => ({
  DbtProjectImportDialog: (props: Record<string, unknown>) => {
    shellState.dbtProjectImportDialogProps = props;
    return props.open ? <div data-testid="dbt-project-import-dialog" /> : null;
  },
}));

vi.mock('./CanvasViewport', () => ({
  default: (props: Record<string, unknown>) => {
    shellState.canvasViewportProps = props;
    return <div data-testid="canvas-viewport" />;
  },
}));

vi.mock('./SqlContextWorkbench', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');

  return {
    SqlContextWorkbench: forwardRef(function MockSqlContextWorkbench(
      _props: Record<string, unknown>,
      ref
    ) {
      useImperativeHandle(ref, () => ({ flush: async () => true }));
      return <div data-testid="sql-context-workbench" />;
    }),
  };
});

export type CanvasShellPropsOverrides = {
  layout?: Partial<CanvasShellLayout>;
  panels?: Partial<CanvasShellPanels>;
  graph?: Partial<CanvasShellGraph>;
  chromeState?: Partial<CanvasShellChromeState>;
  graphCommands?: Partial<CanvasShellGraphCommands>;
  chromeCommands?: Partial<CanvasShellChromeCommands>;
  canvasCommands?: Partial<CanvasShellCanvasCommands>;
  workspaceCommands?: CanvasShellWorkspaceCommands;
  warehouseSourceImport?: IWarehouseSourceImportPort;
  warehouseSourceDataSampleQuery?: IWarehouseSourceDataSampleQueryPort;
  runSnapshot?: CanvasShellProps['runSnapshot'];
  runMaterializationSampleQuery?: CanvasShellProps['runMaterializationSampleQuery'];
  sourceImportInitialSelection?: CanvasShellProps['sourceImportInitialSelection'];
  onSourceImportInitialSelectionConsumed?: CanvasShellProps['onSourceImportInitialSelectionConsumed'];
  onDbtProjectImported?: CanvasShellProps['onDbtProjectImported'];
  runControls?: CanvasShellProps['runControls'];
};

export function getCanvasShellState(): typeof shellState {
  return shellState;
}

export function buildPlanRunReadiness(
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

export function buildCanvasShellProps(overrides?: CanvasShellPropsOverrides): CanvasShellProps {
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
      centerSurface: undefined,
      contextualWorkbench: undefined,
      readOnlyBanner: undefined,
      ...overrides?.layout,
    },
    panels: {
      authoringNodeKinds: [buildTestNodeKind()],
      activeCanvasId: 'canvas-test',
      activeCanvas: {
        id: 'canvas-test',
        kind: 'transformation',
        title: 'Transformation canvas',
      },
      canvasDocuments: [
        {
          id: 'canvas-test',
          kind: 'transformation',
          title: 'Transformation canvas',
        },
      ],
      executionEnvironmentOptions: [{ value: 'dev', label: 'dev' }],
      inspectorNode: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      inspectorAuthoring: {
        canEditNode: true,
        onApplyNodeDraft: vi.fn(),
      },
      inspectorWorkbenchContributions: [],
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
      viewport: null,
      frozenNodeIds: new Set(),
      ...overrides?.graph,
    },
    chromeState: {
      routeState: 'ready',
      draftStatusState: defaultDraftStatusState,
      canPlanGraph: false,
      canStartRun: false,
      canExportProjectSnapshot: true,
      canImportProjectSnapshot: true,
      planStatusSummary: canvasViewCopy.planStatusPreviewRequiredMessage,
      planRunReadiness: buildPlanRunReadiness(),
      executionSelectionRecovery: null,
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
      onViewportChange: vi.fn(),
      onDrop: vi.fn(),
      onDragOver: vi.fn(),
      onToggleFrozenNode: vi.fn(),
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
      onGridSizeChange: vi.fn(),
      onCanvasPaletteChange: vi.fn(),
      onToggleGridVisible: vi.fn(),
      onGridColorChange: vi.fn(),
      onToggleSnapToGrid: vi.fn(),
      onExportProjectSnapshot: vi.fn(),
      onImportProjectSnapshotFile: vi.fn(),
      onReloadLatestDraft: vi.fn(),
      onPreviewExecutionPlan: vi.fn(),
      onRun: vi.fn(),
      executionSelectionRecovery: null,
      ...overrides?.chromeCommands,
    },
    canvasCommands: {
      onSelectCanvas: vi.fn(),
      ...overrides?.canvasCommands,
    },
    runControls: overrides?.runControls ?? null,
    workspaceCommands: overrides?.workspaceCommands,
    warehouseSourceImport: overrides?.warehouseSourceImport,
    warehouseSourceDataSampleQuery: overrides?.warehouseSourceDataSampleQuery,
    runSnapshot: overrides?.runSnapshot,
    runMaterializationSampleQuery: overrides?.runMaterializationSampleQuery,
    sourceImportInitialSelection: overrides?.sourceImportInitialSelection,
    onSourceImportInitialSelectionConsumed: overrides?.onSourceImportInitialSelectionConsumed,
    onDbtProjectImported: overrides?.onDbtProjectImported,
  };
}

export function createCanvasShellHarness(): {
  container: HTMLDivElement;
  render: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  renderProps: (props: CanvasShellProps) => Promise<void>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  shellState.canvasViewportProps = null;
  shellState.sourceImportWizardProps = null;
  shellState.dbtProjectImportDialogProps = null;
  useCanvasInteractionStore.setState({
    contextualWorkbenchId: null,
    contextualWorkbenchOwnerKey: null,
  });
  useUiLayoutStore.setState({ bottomDrawerHeight: 0, bottomDrawerVisible: false });

  return {
    container,
    render: async (overrides?: CanvasShellPropsOverrides) => {
      const props = buildCanvasShellProps(overrides);
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <CanvasShell {...props} />
          </QueryClientProvider>
        );
      });
      return props;
    },
    renderProps: async (props: CanvasShellProps) => {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <CanvasShell {...props} />
          </QueryClientProvider>
        );
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      useOperationalDrawerContributionStore.setState({ activeTab: 'log', contribution: null });
      useUiLayoutStore.setState({ bottomDrawerHeight: 0, bottomDrawerVisible: false });
      useCanvasInteractionStore.setState({
        contextualWorkbenchId: null,
        contextualWorkbenchOwnerKey: null,
      });
      queryClient.clear();
      container.remove();
      vi.clearAllMocks();
    },
  };
}
