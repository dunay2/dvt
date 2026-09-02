/**
 * Owned concern: define the semantic component contract for CanvasShell.
 */
import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';
import type React from 'react';
import type { DbtProjectImportResult, DbtProjectSourceTableDeclaration } from '@dvt/contracts';

import type {
  ImportSourcesResult,
  IWarehouseSourceDataSampleQueryPort,
  IWarehouseSourceImportPort,
} from '../../ports/workspace';
import type { SourceImportInitialSelection } from '../../components/sourceImportWizard/types';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { CanvasSurfaceStrategy } from '../../plugins/canvasSurfaceStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasPaletteId } from './canvasPalette';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import type { ProjectCanvasDocument, ProjectCanvasPatch } from './canvasProjectCanvasLifecycle';
import type { WorkspaceOption } from '../../services/config/workspaceConfig';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import type { CanvasSourceImportCompletionContext } from './canvasMutationHandlerContracts';
import type { CanvasContextMenuPosition } from './canvasInteractionCommandSurface';
import type {
  CanvasExecutionSelectionRecoveryCommands,
  CanvasExecutionSelectionRecoveryReadModel,
} from '../../types/canvasExecutionSelectionRecovery';
import type { OperationalDrawerRunControls } from '../../components/shell/operationalDrawerContributionStore';
import type { IRunsPort, RunSnapshot } from '../../ports/runs';
import type { CanvasEdgeCommandRunner } from './useCanvasEdgeCommandRunner';

export type UserPermissions = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
};

type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasShellLayout = {
  focusMode: boolean;
  inspectorPanelVisible: boolean;
  canOpenSourceImport: boolean;
  canMoveNodes?: boolean;
  canSelectNodes?: boolean;
  surfaceStrategy: CanvasSurfaceStrategy | null;
  contextualWorkbench?: CanvasShellContextualWorkbench;
  centerSurfaceMode: 'replace' | 'overlay';
  centerSurface?: React.ReactNode;
  readOnlyBanner?: React.ReactNode;
};

export type CanvasShellContextualWorkbench = Readonly<{
  id: 'project-code';
  title: string;
  closeLabel: string;
  moveLabel?: string;
  description?: string;
  panel: React.ReactNode;
  requestClose: () => Promise<boolean>;
}>;

export type CanvasShellPanels = {
  authoringNodeKinds: readonly NodeKindRegistration[];
  activeCanvasId: string | null;
  activeCanvas: ProjectCanvasDocument | null;
  canvasDocuments: readonly ProjectCanvasDocument[];
  executionEnvironmentOptions: readonly WorkspaceOption[];
  canEditCanvas: boolean;
  canDeleteActiveCanvas: boolean;
  inspectorNode: CanonicalNode | null;
  inspectorPreferredTabId: string | null;
  inspectorPreferredTabRequestId: number;
  inspectorGraphNodes: readonly CanonicalNode[];
  inspectorGraphEdges: readonly CanonicalEdge[];
  inspectorAuthoring: CanvasInspectorAuthoringContract;
  inspectorWorkbenchContributions: readonly CanvasNodeWorkbenchContribution[];
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
  runtimeCapabilities?: RuntimeCapabilities;
  userPermissions: UserPermissions;
  importedNodeFocusIds: string[];
};

export type CanvasShellGraph = {
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  canvasEmptyStateGuideVisible: boolean;
  viewport: CanvasViewport | null;
  frozenNodeIds: ReadonlySet<string>;
};

export type CanvasShellChromeState = {
  canvasAuthoringMode: CanvasGraphAuthoringMode;
  routeState: CanvasRouteState;
  draftStatusState: CanvasDraftStatusState;
  canPlanGraph: boolean;
  canStartRun: boolean;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  planStatusSummary: string;
  planRunReadiness: PlanRunReadinessReadModel;
  executionSelectionRecovery: CanvasExecutionSelectionRecoveryReadModel | null;
  exclusiveOverlayMode: 'runtime' | 'cost';
  canUseCostOverlay: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  transformationValidation: TransformationGraphValidationResult;
};

export type CanvasShellGraphCommands = {
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']>;
  onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  onSetEdgeExecutionGate: CanvasEdgeCommandRunner['setExecutionGate'];
  onViewportChange: (viewport: CanvasViewport) => void;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onToggleFrozenNode: (nodeId: string) => void;
  onCreateAuthoringNode: CreateCanvasAuthoringNode;
  onSourceImportComplete: (
    result: ImportSourcesResult,
    context?: CanvasSourceImportCompletionContext
  ) => void;
  onImportedNodeFocusComplete: () => void;
  onImpactFocusNodeChange?: (nodeId: string | null) => void;
};

export type CanvasShellChromeCommands = {
  onHideInspector: () => void;
  onShowInspector: () => void;
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onGridSizeChange: (size: number) => void;
  onCanvasPaletteChange: (color: CanvasPaletteId) => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onSetCanvasEmptyStateGuideVisible: (visible: boolean) => void;
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
  onReloadLatestDraft: () => void;
  onPreviewExecutionPlan: () => void;
  onRun: () => void;
  executionSelectionRecovery: CanvasExecutionSelectionRecoveryCommands | null;
};

export type CanvasShellCanvasCommands = {
  onSelectCanvas: (canvasId: string) => void;
  onApplyCanvasPatch: (patch: ProjectCanvasPatch) => void;
  onDeleteActiveCanvas: () => void;
};

export type CanvasShellWorkspaceCommands = Readonly<{
  canOpenProjectExplorer?: boolean;
  onOpenProjectCode?: () => void;
}>;

export type CanvasShellProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  chromeState: CanvasShellChromeState;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  canvasCommands: CanvasShellCanvasCommands;
  runControls: OperationalDrawerRunControls | null;
  workspaceCommands?: CanvasShellWorkspaceCommands;
  warehouseSourceImport?: IWarehouseSourceImportPort;
  warehouseSourceDataSampleQuery?: IWarehouseSourceDataSampleQueryPort;
  runSnapshot?: RunSnapshot | null;
  runMaterializationSampleQuery?: IRunsPort['getRunMaterializationSample'];
  canvasContextScreenToFlowPosition?: (
    screenPosition: CanvasContextMenuPosition
  ) => CanvasContextMenuPosition;
  sourceImportInitialSelection?: SourceImportInitialSelection;
  onSourceImportInitialSelectionConsumed?: () => void;
  onDbtProjectImported?: (
    result: DbtProjectImportResult,
    sourceTableDeclarations: readonly DbtProjectSourceTableDeclaration[]
  ) => void;
}>;

export type CanvasShellOpenDataRegistryCommand = (
  initialSelection?: SourceImportInitialSelection,
  placement?: CanvasShellSourceImportPlacement
) => void;

export type CanvasShellSourceImportPlacement = CanvasSourceImportCompletionContext;
