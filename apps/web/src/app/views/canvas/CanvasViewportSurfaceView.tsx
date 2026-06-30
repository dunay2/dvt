/** Owned concern: render the Canvas React Flow surface from an already-resolved viewport model. */
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import type { DragEventHandler, RefObject } from 'react';

import { GraphNodeHealthPopoverView } from '../../plugins/graph/GraphNodeHealthPopoverView';
import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { CanvasPaletteId } from './canvasPalette';
import { CanvasContextMenuView } from './CanvasContextMenuView';
import { CanvasNodeFloatingToolbarView } from './CanvasNodeFloatingToolbarView';
import type { CanvasNodeFloatingToolbarModel } from './canvasNodeFloatingToolbarModel';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';

type CanvasViewportSurfaceViewProps = Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  resolvedCanvasPalette: CanvasPaletteId;
  canEditEdges: boolean;
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  viewport: { x: number; y: number; zoom: number } | null;
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']>;
  onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  contextMenuPresenter: CanvasContextMenuPresenter;
  renderContextMenuView: boolean;
  nodeFloatingToolbarModel: CanvasNodeFloatingToolbarModel | null;
  onCloseNodeFloatingToolbar: () => void;
  nodeHealthPopoverModel: {
    detail: GraphNodeOperationalDetail;
    position: { x: number; y: number };
  } | null;
  onCloseNodeHealthPopover: () => void;
}>;

function resolveMiniMapNodeColor(node: { data?: unknown }): string {
  const pluginKind = (node.data as { pluginKind?: string }).pluginKind ?? 'dvt:unknown';
  return resolveNodeKindRegistration(pluginKind).minimapColor;
}

function CanvasViewportReactFlowSurface({
  canEditEdges,
  nodesWithImpact,
  edges,
  nodeTypes,
  gridSize,
  canvasGridVisible,
  canvasGridColor,
  canvasSnapToGrid,
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onNodeDrag,
  onNodeDragStop,
  onDrop,
  onDragOver,
  contextMenuPresenter,
  onCloseNodeFloatingToolbar,
  onCloseNodeHealthPopover,
}: Omit<
  CanvasViewportSurfaceViewProps,
  | 'viewportRef'
  | 'resolvedCanvasPalette'
  | 'renderContextMenuView'
  | 'nodeFloatingToolbarModel'
  | 'nodeHealthPopoverModel'
>): JSX.Element {
  const handlePaneClick: NonNullable<ReactFlowProps<Node, Edge>['onPaneClick']> = (event) => {
    onCloseNodeFloatingToolbar();
    onCloseNodeHealthPopover();
    contextMenuPresenter.handlePaneClick(event);
  };
  const handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']> = (event, node) => {
    contextMenuPresenter.closeContextMenu();
    onNodeClick(event, node);
  };
  const handleSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']> = (
    selection
  ) => {
    onSelectionChange(selection);
  };
  const handleNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onCloseNodeFloatingToolbar();
    onCloseNodeHealthPopover();
    onNodeDrag(event, node, nodes);
  };
  const handleNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onCloseNodeFloatingToolbar();
    onCloseNodeHealthPopover();
    onNodeDragStop(event, node, nodes);
  };
  const handlePaneContextMenu: NonNullable<ReactFlowProps<Node, Edge>['onPaneContextMenu']> = (
    event
  ) => {
    onCloseNodeFloatingToolbar();
    onCloseNodeHealthPopover();
    contextMenuPresenter.handlePaneContextMenu(event);
  };
  const handleEdgeContextMenu: NonNullable<ReactFlowProps<Node, Edge>['onEdgeContextMenu']> = (
    event,
    edge
  ) => {
    onCloseNodeFloatingToolbar();
    onCloseNodeHealthPopover();
    contextMenuPresenter.handleEdgeContextMenu(event, edge);
  };

  return (
    <div
      ref={contextMenuPresenter.contextSurfaceRef}
      data-slot="canvas-viewport-context-surface"
      className="h-full w-full"
      onContextMenuCapture={contextMenuPresenter.handleViewportContextMenu}
    >
      <ReactFlow
        nodes={nodesWithImpact}
        edges={edges}
        onNodesChange={canEditEdges ? onNodesChange : undefined}
        onEdgesChange={canEditEdges ? onEdgesChange : undefined}
        onConnect={onConnect}
        onReconnect={canEditEdges ? onReconnect : undefined}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        nodesDraggable={canEditEdges}
        nodesConnectable={canEditEdges}
        snapToGrid={canvasSnapToGrid}
        snapGrid={[gridSize, gridSize]}
        nodesFocusable={canEditEdges}
        edgesFocusable={canEditEdges}
        edgesReconnectable={canEditEdges}
        elementsSelectable={canEditEdges}
        selectNodesOnDrag
        multiSelectionKeyCode="Shift"
        deleteKeyCode={canEditEdges ? undefined : null}
        disableKeyboardA11y={!canEditEdges}
        fitView={viewport == null}
        fitViewOptions={{ padding: 0.2, maxZoom: 0.82 }}
        minZoom={0.35}
        defaultViewport={viewport ?? undefined}
        onMoveEnd={(_event, nextViewport) => onViewportChange(nextViewport)}
        onNodeDrag={handleNodeDrag}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneContextMenu={handlePaneContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        className="bg-(--canvas-surface)"
      >
        {canvasGridVisible ? <Background color={canvasGridColor} gap={gridSize} /> : null}
        <Controls />
        <MiniMap
          pannable
          zoomable
          className="rounded-lg"
          maskColor="var(--canvas-minimap-mask)"
          maskStrokeColor="var(--canvas-minimap-mask-stroke)"
          maskStrokeWidth={3}
          nodeColor={resolveMiniMapNodeColor}
          nodeBorderRadius={4}
        />
      </ReactFlow>
    </div>
  );
}

export function CanvasViewportSurfaceView({
  viewportRef,
  resolvedCanvasPalette,
  renderContextMenuView,
  contextMenuPresenter,
  nodeFloatingToolbarModel,
  onCloseNodeFloatingToolbar,
  nodeHealthPopoverModel,
  onCloseNodeHealthPopover,
  ...reactFlowSurfaceProps
}: CanvasViewportSurfaceViewProps): JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid="canvas-viewport"
      data-canvas-palette={resolvedCanvasPalette}
      className="relative flex-1 overflow-hidden"
    >
      <CanvasViewportReactFlowSurface
        {...reactFlowSurfaceProps}
        contextMenuPresenter={contextMenuPresenter}
        onCloseNodeFloatingToolbar={onCloseNodeFloatingToolbar}
        onCloseNodeHealthPopover={onCloseNodeHealthPopover}
      />
      {nodeFloatingToolbarModel == null ? null : (
        <CanvasNodeFloatingToolbarView model={nodeFloatingToolbarModel} />
      )}
      {nodeHealthPopoverModel == null ? null : (
        <GraphNodeHealthPopoverView
          detail={nodeHealthPopoverModel.detail}
          position={nodeHealthPopoverModel.position}
          onClose={onCloseNodeHealthPopover}
        />
      )}
      {renderContextMenuView ? (
        <CanvasContextMenuView
          model={contextMenuPresenter.model}
          menuRef={contextMenuPresenter.menuRef}
          onCanvasAction={contextMenuPresenter.handleCanvasAction}
          onCreateNodeAction={contextMenuPresenter.handleCreateNodeAction}
          onEdgeAction={contextMenuPresenter.handleEdgeAction}
        />
      ) : null}
    </div>
  );
}

export type { CanvasViewportSurfaceViewProps };
