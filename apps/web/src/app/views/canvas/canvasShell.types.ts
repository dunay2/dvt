/**
 * Owned concern: define the semantic component contract for CanvasShell.
 */
import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';
import type React from 'react';

import type { ImportSourcesResult } from '../../ports/workspace';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasPaletteId } from './canvasPalette';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { CanvasInspectorAuthoringContract } from './canvasInspectorAuthoring.types';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

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
  explorerPanelVisible: boolean;
  inspectorPanelVisible: boolean;
  canOpenSourceImport: boolean;
  hostTabState: CanvasPlaygroundTabState;
  hostTabStrip?: React.ReactNode;
  workbenchTabStrip?: React.ReactNode;
  workbenchTabPanel?: React.ReactNode;
  centerSurfaceMode: 'replace' | 'overlay';
  centerSurface?: React.ReactNode;
  readOnlyBanner?: React.ReactNode;
};

export type CanvasShellPanels = {
  explorerNodes: CanonicalNode[];
  authoringNodeKinds: readonly NodeKindRegistration[];
  inspectorNode: CanonicalNode | null;
  inspectorAuthoring: CanvasInspectorAuthoringContract;
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
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
  viewport: CanvasViewport | null;
};

export type CanvasShellToolbar = {
  canvasAuthoringMode: CanvasGraphAuthoringMode;
  routeState: CanvasRouteState;
  draftToolbarState: CanvasDraftToolbarState;
  canStartRun: boolean;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  planStatusSummary: string;
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
  onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  onViewportChange: (viewport: CanvasViewport) => void;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onCreateAuthoringNode: (registration: NodeKindRegistration) => void;
  onSourceImportComplete: (result: ImportSourcesResult) => void;
  onImportedNodeFocusComplete: () => void;
};

export type CanvasShellChromeCommands = {
  onHideExplorer: () => void;
  onShowExplorer: () => void;
  onHideInspector: () => void;
  onShowInspector: () => void;
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
  onReloadLatestDraft: () => void;
  onPlan: () => void;
  onRun: () => void;
};

export type CanvasShellProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  toolbar: CanvasShellToolbar;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
}>;
