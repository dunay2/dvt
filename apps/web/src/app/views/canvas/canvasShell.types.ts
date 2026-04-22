/** Owned concern: define the grouped semantic prop contract for the Canvas shell component. */
import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';
import type React from 'react';

import type { ImportSourcesResult } from '../../ports/workspace';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasPaletteId } from './canvasPalette';
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
  canOpenSourceImport: boolean;
};

export type CanvasShellPanels = {
  explorerNodes: CanonicalNode[];
  inspectorNode: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
  userPermissions: UserPermissions;
};

export type CanvasShellGraph = {
  canvasAuthoringMode: 'transformation' | 'dbt';
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  viewport: { x: number; y: number; zoom: number } | null;
};

export type CanvasShellGraphCommands = {
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onSourceImportComplete: (result: ImportSourcesResult) => void;
  importedNodeFocusIds: string[];
  onImportedNodeFocusComplete: () => void;
};

export type CanvasShellChromeCommands = {
  onHideExplorer: () => void;
  onShowExplorer: () => void;
  onHideInspector: () => void;
  onShowInspector: () => void;
};

export type CanvasShellToolbar = {
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onReloadLatestDraft: () => void;
  onPlan: () => void;
  onRun: () => void;
  draftToolbarState: CanvasDraftToolbarState;
  canStartRun: boolean;
  planStatusSummary: string;
  exclusiveOverlayMode: 'runtime' | 'cost';
  canUseCostOverlay: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  transformationValidation: TransformationGraphValidationResult;
};

export type CanvasShellProps = Readonly<{
  layout: CanvasShellLayout;
  panels: CanvasShellPanels;
  graph: CanvasShellGraph;
  graphCommands: CanvasShellGraphCommands;
  chromeCommands: CanvasShellChromeCommands;
  toolbar: CanvasShellToolbar;
  centerSurface?: React.ReactNode;
  readOnlyBanner?: React.ReactNode;
}>;
