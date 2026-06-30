/** Owned concern: orchestrate the Canvas viewport presenter, lifecycle, and presentation view. */
import {
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEventHandler } from 'react';

import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
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

type NodeHealthPopoverModel = Readonly<{
  nodeId: string;
  detail: GraphNodeOperationalDetail;
  position: { x: number; y: number };
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
  const [nodeHealthPopoverModel, setNodeHealthPopoverModel] =
    useState<NodeHealthPopoverModel | null>(null);
  const resolvedCanvasPalette = normalizeCanvasPaletteId(props.canvasPalette);
  const canvasStyle = resolveCanvasViewportStyle(resolvedCanvasPalette, props.gridSize, {
    gridVisible: props.canvasGridVisible,
    gridColor: props.canvasGridColor,
  });
  const closeNodeFloatingToolbar = useCallback(() => {
    setNodeFloatingToolbarModel(null);
  }, []);
  const closeNodeHealthPopover = useCallback(() => {
    setNodeHealthPopoverModel(null);
  }, []);

  const openNodeHealthPopover = useCallback(
    (nodeId: string, detail: GraphNodeOperationalDetail, anchorRect: DOMRect) => {
      setNodeFloatingToolbarModel(null);
      setNodeHealthPopoverModel({
        nodeId,
        detail,
        position: {
          x: Math.max(8, anchorRect.left),
          y: Math.max(8, anchorRect.bottom + 8),
        },
      });
    },
    []
  );

  const nodesWithOperationalDetails = useMemo(
    () =>
      props.nodesWithImpact.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onOpenOperationalDetails: (detail: GraphNodeOperationalDetail, anchorRect: DOMRect) =>
            openNodeHealthPopover(node.id, detail, anchorRect),
        },
      })),
    [openNodeHealthPopover, props.nodesWithImpact]
  );

  useEffect(() => {
    if (nodeFloatingToolbarModel == null) {
      return;
    }

    const toolbarOwnerStillExists = props.nodesWithImpact.some(
      (node) => node.id === nodeFloatingToolbarModel.nodeId
    );
    if (!toolbarOwnerStillExists) {
      setNodeFloatingToolbarModel(null);
    }
  }, [nodeFloatingToolbarModel, props.nodesWithImpact]);

  useEffect(() => {
    if (nodeHealthPopoverModel == null) {
      return;
    }

    const popoverOwnerStillExists = props.nodesWithImpact.some(
      (node) => node.id === nodeHealthPopoverModel.nodeId
    );
    if (!popoverOwnerStillExists) {
      setNodeHealthPopoverModel(null);
    }
  }, [nodeHealthPopoverModel, props.nodesWithImpact]);

  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (event, node) => {
      closeNodeHealthPopover();
      const eventTarget = event.currentTarget as Element | undefined;
      const nodeRect =
        typeof eventTarget?.getBoundingClientRect === 'function'
          ? eventTarget.getBoundingClientRect()
          : null;
      const data = node.data as Record<string, unknown>;
      const nodeName = typeof data.name === 'string' && data.name.length > 0 ? data.name : node.id;
      const inspectNode = data.onInspectNode;
      const toolbarPosition =
        nodeRect == null
          ? { x: Math.max(8, event.clientX - 8), y: Math.max(8, event.clientY - 52) }
          : { x: Math.max(8, nodeRect.left), y: Math.max(8, nodeRect.top - 52) };

      setNodeFloatingToolbarModel(
        buildCanvasNodeFloatingToolbarModel({
          nodeId: node.id,
          nodeName,
          position: toolbarPosition,
          onOpenCode:
            typeof inspectNode === 'function'
              ? (nodeId) => {
                  inspectNode(nodeId, 'code');
                }
              : undefined,
        })
      );
      props.onNodeClick(event, node);
    },
    [closeNodeHealthPopover, props.onNodeClick]
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
      nodesWithImpact={nodesWithOperationalDetails}
      edges={props.edges}
      nodeTypes={props.nodeTypes}
      gridSize={props.gridSize}
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
      nodeHealthPopoverModel={nodeHealthPopoverModel}
      onCloseNodeHealthPopover={closeNodeHealthPopover}
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
