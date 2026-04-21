/**
 * Owned concern: define the semantic component contract for CanvasShell.
 */
import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';
import type React from 'react';

import type { ImportSourcesResult } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasPaletteId } from './canvasPalette';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

export type UserPermissions = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
};

export type CanvasShellLayout = {
  focusMode: boolean;
  explorerPanelVisible: boolean;
  inspectorPanelVisible: boolean;
  centerSurface?: React.ReactNode;
  readOnlyBanner?: React.ReactNode;
};

export type CanvasShellPanels = {
  explorerNodes: CanonicalNode[];
  inspectorNode: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
  userPermissions: UserPermissions;
  importedNodeFocusIds: string[];
};

type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasShellGraph = {
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  viewport: CanvasViewport | null;
};

export type CanvasShellToolbar = {
  canvasAuthoringMode: 'transformation' | 'dbt';
  routeState: CanvasRouteState;
  draftToolbarState: CanvasDraftToolbarState;
  canStartRun: boolean;
  planStatusSummary: string;
  exclusiveOverlayMode: 'runtime' | 'cost';
  canUseCostOverlay: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  transformationValidation: TransformationGraphValidationResult;
};

export type CanvasShellGraphCommands = {
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  onViewportChange: (viewport: CanvasViewport) => void;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
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
  onReloadLatestDraft: () => void;
  onPlan: () => void;
  onRun: () => void;
};

export type CanvasShellProps = {
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  toolbar: CanvasShellToolbar;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
};
