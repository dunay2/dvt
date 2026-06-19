import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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
} from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import { dvtCanvasSurfaceStrategy } from '../../plugins/dvt/dvtCanvasSurfaceStrategy';

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

export type CanvasShellPropsOverrides = {
  layout?: Partial<CanvasShellLayout>;
  panels?: Partial<CanvasShellPanels>;
  graph?: Partial<CanvasShellGraph>;
  chromeState?: Partial<CanvasShellChromeState>;
  graphCommands?: Partial<CanvasShellGraphCommands>;
  chromeCommands?: Partial<CanvasShellChromeCommands>;
  canvasCommands?: Partial<CanvasShellCanvasCommands>;
  warehouseSourceImport?: IWarehouseSourceImportPort;
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
      hostTabState: {
        activeTabId: null,
        tabs: [],
      },
      centerSurfaceMode: 'replace',
      centerSurface: undefined,
      contextualWorkbench: undefined,
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

export function createCanvasShellHarness(): {
  container: HTMLDivElement;
  render: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  renderProps: (props: CanvasShellProps) => Promise<void>;
  unmount: () => void;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  shellState.canvasViewportProps = null;
  shellState.sourceImportWizardProps = null;

  return {
    container,
    render: async (overrides?: CanvasShellPropsOverrides) => {
      const props = buildCanvasShellProps(overrides);
      await act(async () => {
        root.render(<CanvasShell {...props} />);
      });
      return props;
    },
    renderProps: async (props: CanvasShellProps) => {
      await act(async () => {
        root.render(<CanvasShell {...props} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      useOperationalDrawerContributionStore.setState({ contribution: null });
      container.remove();
      vi.clearAllMocks();
    },
  };
}
