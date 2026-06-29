/** Owned concern: orchestrate the Canvas viewport presenter, lifecycle, and presentation view. */
import {
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useCallback, useRef, useState, type DragEventHandler } from 'react';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { normalizeCanvasPaletteId, type CanvasPaletteId } from './canvasPalette';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import {
  buildCanvasNodeFloatingToolbarModel,
  type CanvasNodeFloatingToolbarModel,
} from './canvasNodeFloatingToolbarModel';
import { CanvasViewportSurfaceView } from './CanvasViewportSurfaceView';
import { resolveCanvasViewportStyle } from './canvasViewportStyle';
import {
  useCanvasContextMenuPresenter,
  type CanvasContextMenuPresenter,
} from './useCanvasContextMenuPresenter';
import { useCanvasViewportLifecycle } from './useCanvasViewportLifecycle';

type CanvasViewportProps = {
  readonly canEditEdges: boolean;
  readonly nodesWithImpact: Node[];
  readonly edges: Edge[];
  readonly nodeTypes: NodeTypes;
  readonly gridSize: number;
  readonly canvasPalette: CanvasPaletteId;
  readonly canvasGridVisible: boolean;
  readonly canvasGridColor: CanvasPaletteId;
  readonly canvasSnapToGrid: boolean;
  readonly viewport: { x: number; y: number; zoom: number } | null;
  readonly onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  readonly onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  readonly onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  readonly onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  readonly onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  readonly onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  readonly onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  readonly onNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']>;
  readonly onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  readonly onDrop: DragEventHandler<HTMLDivElement>;
  readonly onDragOver: DragEventHandler<HTMLDivElement>;
  readonly authoringNodeKinds: readonly NodeKindRegistration[];
  readonly onCreateAuthoringNode: CreateCanvasAuthoringNode;
  readonly importedNodeFocusIds: string[];
  readonly onImportedNodeFocusComplete: () => void;
  readonly canOpenSourceImport?: boolean;
  readonly onOpenSourceImport?: (flowPosition?: { x: number; y: number }) => void;
  readonly canOpenCanvasSettings?: boolean;
  readonly onOpenCanvasSettings?: () => void;
  readonly contextMenuPresenter?: CanvasContextMenuPresenter;
};

type CanvasViewportWithPresenterProps = CanvasViewportProps &
  Readonly<{
    contextMenuPresenter: CanvasContextMenuPresenter;
    renderContextMenuView: boolean;
  }>;

function CanvasViewportWithPresenter({
  contextMenuPresenter,
  renderContextMenuView,
  ...props
}: CanvasViewportWithPresenterProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [nodeFloatingToolbarModel, setNodeFloatingToolbarModel] =
    useState<CanvasNodeFloatingToolbarModel | null>(null);
  const resolvedCanvasPalette = normalizeCanvasPaletteId(props.canvasPalette);
  const canvasStyle = resolveCanvasViewportStyle(resolvedCanvasPalette, props.gridSize);
  const closeNodeFloatingToolbar = useCallback(() => {
    setNodeFloatingToolbarModel(null);
  }, []);
  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (event, node) => {
      const surfaceRect = viewportRef.current?.getBoundingClientRect();
      const localX = surfaceRect == null ? event.clientX : event.clientX - surfaceRect.left;
      const localY = surfaceRect == null ? event.clientY : event.clientY - surfaceRect.top;
      const data = node.data as Record<string, unknown>;
      const nodeName = typeof data.name === 'string' && data.name.length > 0 ? data.name : node.id;
      const inspectNode = data.onInspectNode;
      const toggleNodeSelection = data.onToggleNodeSelection;

      setNodeFloatingToolbarModel(
        buildCanvasNodeFloatingToolbarModel({
          nodeId: node.id,
          nodeName,
          selectedForExecution: data.selectedForExecution === true,
          position: { x: Math.max(8, localX - 8), y: Math.max(8, localY - 52) },
          onOpenCode:
            typeof inspectNode === 'function'
              ? (nodeId) => {
                  inspectNode(nodeId, 'code');
                }
              : undefined,
          onToggleExecutionSelection:
            typeof toggleNodeSelection === 'function'
              ? (nodeId, shouldSelect) => {
                  toggleNodeSelection(nodeId, shouldSelect);
                }
              : undefined,
        })
      );
      props.onNodeClick(event, node);
    },
    [props.onNodeClick]
  );

  useCanvasViewportLifecycle({
    viewportRef,
    canvasStyle,
    viewport: props.viewport,
    importedNodeFocusIds: props.importedNodeFocusIds,
    nodesWithImpact: props.nodesWithImpact,
    onImportedNodeFocusComplete: props.onImportedNodeFocusComplete,
    reactFlow,
  });

  return (
    <CanvasViewportSurfaceView
      viewportRef={viewportRef}
      resolvedCanvasPalette={resolvedCanvasPalette}
      canEditEdges={props.canEditEdges}
      nodesWithImpact={props.nodesWithImpact}
      edges={props.edges}
      nodeTypes={props.nodeTypes}
      gridSize={props.gridSize}
      canvasGridVisible={props.canvasGridVisible}
      canvasGridColor={props.canvasGridColor}
      canvasSnapToGrid={props.canvasSnapToGrid}
      viewport={props.viewport}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      onReconnect={props.onReconnect}
      onNodeClick={handleNodeClick}
      onSelectionChange={props.onSelectionChange}
      onViewportChange={props.onViewportChange}
      onNodeDrag={props.onNodeDrag}
      onNodeDragStop={props.onNodeDragStop}
      onDrop={props.onDrop}
      onDragOver={props.onDragOver}
      contextMenuPresenter={contextMenuPresenter}
      renderContextMenuView={renderContextMenuView}
      nodeFloatingToolbarModel={nodeFloatingToolbarModel}
      onCloseNodeFloatingToolbar={closeNodeFloatingToolbar}
    />
  );
}

function CanvasViewportLocalPresenter(props: CanvasViewportProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: props.canEditEdges,
    canOpenSourceImport: props.canOpenSourceImport,
    canOpenCanvasSettings: props.canOpenCanvasSettings,
    authoringNodeKinds: props.authoringNodeKinds,
    screenToFlowPosition: (screenPosition) => reactFlow.screenToFlowPosition(screenPosition),
    onCreateAuthoringNode: props.onCreateAuthoringNode,
    onEdgesChange: props.onEdgesChange,
    onOpenSourceImport: props.onOpenSourceImport,
    onOpenCanvasSettings: props.onOpenCanvasSettings,
  });

  return (
    <CanvasViewportWithPresenter
      {...props}
      contextMenuPresenter={contextMenuPresenter}
      renderContextMenuView
    />
  );
}

export default function CanvasViewport(props: CanvasViewportProps): JSX.Element {
  if (props.contextMenuPresenter != null) {
    return (
      <CanvasViewportWithPresenter
        {...props}
        contextMenuPresenter={props.contextMenuPresenter}
        renderContextMenuView={false}
      />
    );
  }

  return <CanvasViewportLocalPresenter {...props} />;
}

export type { CanvasViewportProps };
