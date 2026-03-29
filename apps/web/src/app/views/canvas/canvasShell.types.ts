import type { Edge, Node, NodeTypes, ReactFlowProps } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';

export type UserPermissions = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
};

export type CanvasShellProps = {
  focusMode: boolean;
  explorerPanelVisible: boolean;
  inspectorPanelVisible: boolean;
  explorerNodes: CanonicalNode[];
  inspectorNode: CanonicalNode | null;
  activeRunId: string | null;
  registeredPlugins: ReadonlySet<string>;
  userPermissions: UserPermissions;
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  viewport: { x: number; y: number; zoom: number } | null;
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onHideExplorer: () => void;
  onShowExplorer: () => void;
  onHideInspector: () => void;
  onShowInspector: () => void;
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onPlan: () => void;
  onRun: () => void;
  exclusiveOverlayMode: 'runtime' | 'cost';
  canUseCostOverlay: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
};
