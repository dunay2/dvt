/** Owned concern: orchestrate the Canvas viewport presenter, lifecycle, and presentation view. */
import {
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useReducer, useRef, type DragEventHandler } from 'react';

import { isCanvasNodeEmbeddedControlTarget } from '../../components/canvas/canvasNodeInteractionBoundary';
import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { normalizeCanvasPaletteId, type CanvasPaletteId } from './canvasPalette';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import { projectCanvasGraphSearchPresentation } from './canvasGraphSearchPresentation';
import { buildCanvasNodeFloatingToolbarModel } from './canvasNodeFloatingToolbarModel';
import {
  createCanvasNodeContextSurfaceState,
  reduceCanvasNodeContextSurface,
} from './canvasNodeContextSurfaceModel';
import { CanvasViewportSurfaceView } from './CanvasViewportSurfaceView';
import { resolveCanvasViewportStyle } from './canvasViewportStyle';
import {
  useCanvasContextMenuPresenter,
  type CanvasContextMenuPresenter,
} from './useCanvasContextMenuPresenter';
import { useCanvasGraphSearchController } from './useCanvasGraphSearchController';
import { useCanvasViewportLifecycle } from './useCanvasViewportLifecycle';

type CanvasViewportProps = {
  readonly canEditEdges: boolean;
  readonly canMoveNodes?: boolean;
  readonly canSelectNodes?: boolean;
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
  readonly frozenNodeIds?: ReadonlySet<string>;
  readonly onToggleFrozenNode?: (nodeId: string) => void;
  readonly authoringNodeKinds: readonly NodeKindRegistration[];
  readonly onCreateAuthoringNode: CreateCanvasAuthoringNode;
  readonly importedNodeFocusIds: string[];
  readonly onImportedNodeFocusComplete: () => void;
  readonly canOpenSourceImport?: boolean;
  readonly onOpenSourceImport?: (flowPosition?: { x: number; y: number }) => void;
  readonly canOpenCanvasSettings?: boolean;
  readonly onOpenCanvasSettings?: () => void;
  readonly contextMenuPresenter?: CanvasContextMenuPresenter;
  readonly externalNodeSurfaceActive?: boolean;
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
  const copy = resolveCanvasViewCopy();
  const graphSearchController = useCanvasGraphSearchController({ nodes: props.nodesWithImpact });
  const viewportRef = useRef<HTMLDivElement>(null);
  const [nodeContextSurfaceState, dispatchNodeContextSurface] = useReducer(
    reduceCanvasNodeContextSurface,
    undefined,
    createCanvasNodeContextSurfaceState
  );
  const nodeFloatingToolbarAnchor =
    nodeContextSurfaceState.activeSurface.kind === 'toolbar'
      ? nodeContextSurfaceState.activeSurface.anchor
      : null;
  const nodeHealthPopoverModel =
    nodeContextSurfaceState.activeSurface.kind === 'health'
      ? nodeContextSurfaceState.activeSurface.model
      : null;
  const nodeHealthPopoverTriggerRef = useRef<HTMLElement | null>(null);
  const resolvedCanvasPalette = normalizeCanvasPaletteId(props.canvasPalette);
  const canvasStyle = resolveCanvasViewportStyle(resolvedCanvasPalette, props.gridSize, {
    gridVisible: props.canvasGridVisible,
    gridColor: props.canvasGridColor,
  });
  const closeNodeFloatingToolbar = useCallback(() => {
    dispatchNodeContextSurface({ type: 'close-transient-surface' });
  }, []);
  const closeNodeHealthPopover = useCallback((restoreTriggerFocus = false) => {
    dispatchNodeContextSurface({ type: 'close-transient-surface' });
    const trigger = nodeHealthPopoverTriggerRef.current;
    nodeHealthPopoverTriggerRef.current = null;
    if (restoreTriggerFocus && trigger?.isConnected) {
      trigger.focus();
    }
  }, []);

  const openNodeHealthPopover = useCallback(
    (nodeId: string, detail: GraphNodeOperationalDetail, anchorElement: HTMLElement) => {
      if (nodeContextSurfaceState.externalSurfaceActive) {
        return;
      }
      const anchorRect = anchorElement.getBoundingClientRect();
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      nodeHealthPopoverTriggerRef.current = anchorElement;
      dispatchNodeContextSurface({
        type: 'open-health',
        model: {
          nodeId,
          detail,
          position: {
            x: Math.max(8, anchorRect.left - (viewportRect?.left ?? 0)),
            y: Math.max(8, anchorRect.bottom - (viewportRect?.top ?? 0) + 8),
          },
        },
      });
    },
    [nodeContextSurfaceState.externalSurfaceActive]
  );

  useEffect(() => {
    const externalSurfaceActive = props.externalNodeSurfaceActive ?? false;
    if (externalSurfaceActive) {
      nodeHealthPopoverTriggerRef.current = null;
    }
    dispatchNodeContextSurface({
      type: 'synchronize-external-surface',
      active: externalSurfaceActive,
    });
  }, [props.externalNodeSurfaceActive]);

  const nodesWithOperationalDetails = useMemo(
    () =>
      props.nodesWithImpact.map((node) => {
        const nodeData = node.data as Record<string, unknown>;
        const inspectNode =
          typeof nodeData.onInspectNode === 'function'
            ? (nodeData.onInspectNode as (...args: unknown[]) => void)
            : null;
        return {
          ...node,
          data: {
            ...node.data,
            ...(inspectNode == null
              ? {}
              : {
                  onInspectNode: (...args: unknown[]) => {
                    closeNodeFloatingToolbar();
                    closeNodeHealthPopover();
                    inspectNode(...args);
                  },
                }),
            onOpenOperationalDetails: (
              detail: GraphNodeOperationalDetail,
              anchorElement: HTMLElement
            ) => openNodeHealthPopover(node.id, detail, anchorElement),
          },
        };
      }),
    [closeNodeFloatingToolbar, closeNodeHealthPopover, openNodeHealthPopover, props.nodesWithImpact]
  );

  const graphSearchPresentation = useMemo(
    () =>
      projectCanvasGraphSearchPresentation({
        nodes: nodesWithOperationalDetails,
        edges: props.edges,
        status: graphSearchController.model.status,
        matchingNodeIds: graphSearchController.matchingNodeIds,
        activeNodeId: graphSearchController.model.activeNodeId,
      }),
    [
      graphSearchController.matchingNodeIds,
      graphSearchController.model.activeNodeId,
      graphSearchController.model.status,
      nodesWithOperationalDetails,
      props.edges,
    ]
  );

  const nodeFloatingToolbarModel = useMemo(() => {
    if (nodeFloatingToolbarAnchor == null) {
      return null;
    }

    const ownerNode = props.nodesWithImpact.find(
      (node) => node.id === nodeFloatingToolbarAnchor.nodeId
    );
    if (ownerNode == null) {
      return null;
    }

    const ownerNodeData = ownerNode.data as Record<string, unknown>;
    const inspectNode = ownerNodeData.onInspectNode;
    const canOpenNodeCode = ownerNodeData.canOpenNodeCode;
    const openNodeCode = ownerNodeData.onOpenNodeCode;
    const contextMenuTrigger = nodeFloatingToolbarAnchor.contextMenuTrigger;
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: nodeFloatingToolbarAnchor.nodeId,
      nodeName: nodeFloatingToolbarAnchor.nodeName,
      position: nodeFloatingToolbarAnchor.position,
      frozen: props.frozenNodeIds?.has(nodeFloatingToolbarAnchor.nodeId) ?? false,
      onOpenCode:
        canOpenNodeCode === false
          ? undefined
          : typeof openNodeCode === 'function'
            ? (nodeId) => {
                closeNodeFloatingToolbar();
                openNodeCode(nodeId);
              }
            : typeof inspectNode === 'function'
              ? (nodeId) => {
                  closeNodeFloatingToolbar();
                  inspectNode(nodeId, 'code');
                }
              : undefined,
      onToggleFreeze: props.onToggleFrozenNode,
      onOpenMore:
        contextMenuTrigger == null
          ? undefined
          : () => {
              const { nodeTop, position } = nodeFloatingToolbarAnchor;
              closeNodeFloatingToolbar();
              contextMenuTrigger.dispatchEvent(
                new MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                  button: 2,
                  clientX: position.x,
                  clientY: nodeTop,
                })
              );
            },
    });

    return model.actions.length > 0 ? model : null;
  }, [
    closeNodeFloatingToolbar,
    nodeFloatingToolbarAnchor,
    props.frozenNodeIds,
    props.nodesWithImpact,
    props.onToggleFrozenNode,
  ]);

  useEffect(() => {
    if (nodeFloatingToolbarAnchor == null) {
      return;
    }

    const toolbarOwnerStillExists = props.nodesWithImpact.some(
      (node) => node.id === nodeFloatingToolbarAnchor.nodeId
    );
    if (!toolbarOwnerStillExists) {
      dispatchNodeContextSurface({
        type: 'remove-node',
        nodeId: nodeFloatingToolbarAnchor.nodeId,
      });
    }
  }, [nodeFloatingToolbarAnchor, props.nodesWithImpact]);

  useEffect(() => {
    if (nodeHealthPopoverModel == null) {
      return;
    }

    const popoverOwnerStillExists = props.nodesWithImpact.some(
      (node) => node.id === nodeHealthPopoverModel.nodeId
    );
    if (!popoverOwnerStillExists) {
      nodeHealthPopoverTriggerRef.current = null;
      dispatchNodeContextSurface({
        type: 'remove-node',
        nodeId: nodeHealthPopoverModel.nodeId,
      });
    }
  }, [nodeHealthPopoverModel, props.nodesWithImpact]);

  useEffect(() => {
    if (nodeHealthPopoverModel == null) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent): void => {
      const viewportElement = viewportRef.current;
      const eventTarget = event.target;
      const popoverElement = viewportElement?.querySelector(
        '[data-slot="graph-node-health-popover"]'
      );
      if (
        popoverElement != null &&
        eventTarget instanceof globalThis.Node &&
        !popoverElement.contains(eventTarget)
      ) {
        closeNodeHealthPopover(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeNodeHealthPopover(true);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeNodeHealthPopover, nodeHealthPopoverModel]);

  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (event, node) => {
      const eventTarget = event.currentTarget instanceof Element ? event.currentTarget : null;
      const clickedTarget = event.target instanceof Element ? event.target : null;
      if (isCanvasNodeEmbeddedControlTarget(event.target)) {
        return;
      }

      closeNodeHealthPopover(false);
      const contextMenuTrigger =
        clickedTarget?.closest('[data-slot="context-menu-trigger"]') ??
        eventTarget?.querySelector('[data-slot="context-menu-trigger"]') ??
        eventTarget;
      const nodeRect =
        typeof eventTarget?.getBoundingClientRect === 'function'
          ? eventTarget.getBoundingClientRect()
          : null;
      const data = node.data as Record<string, unknown>;
      const nodeName = typeof data.name === 'string' && data.name.length > 0 ? data.name : node.id;
      const toolbarPosition =
        nodeRect == null
          ? { x: Math.max(8, event.clientX - 8), y: Math.max(8, event.clientY - 52) }
          : { x: Math.max(8, nodeRect.left), y: Math.max(8, nodeRect.top - 52) };

      dispatchNodeContextSurface({
        type: 'open-toolbar',
        anchor: {
          nodeId: node.id,
          nodeName,
          position: toolbarPosition,
          nodeTop: nodeRect?.top ?? toolbarPosition.y + 52,
          contextMenuTrigger,
        },
      });
      props.onNodeClick(event, node);
    },
    [closeNodeHealthPopover, props.onNodeClick]
  );

  useCanvasViewportLifecycle({
    viewportRef,
    canvasStyle,
    viewport: props.viewport,
    importedNodeFocusIds: props.importedNodeFocusIds,
    activeSearchNodeId: graphSearchController.model.activeNodeId,
    nodesWithImpact: props.nodesWithImpact,
    onImportedNodeFocusComplete: props.onImportedNodeFocusComplete,
    reactFlow,
  });

  return (
    <CanvasViewportSurfaceView
      viewportRef={viewportRef}
      resolvedCanvasPalette={resolvedCanvasPalette}
      canEditEdges={props.canEditEdges}
      canMoveNodes={props.canMoveNodes ?? props.canEditEdges}
      canSelectNodes={props.canSelectNodes ?? props.canEditEdges}
      nodesWithImpact={graphSearchPresentation.nodes}
      edges={graphSearchPresentation.edges}
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
      contextSurfaceLabel={copy.canvasViewportContextSurfaceLabel}
      contextMenuLabel={copy.canvasContextMenuLabel}
      nodeFloatingToolbarModel={nodeFloatingToolbarModel}
      onCloseNodeFloatingToolbar={closeNodeFloatingToolbar}
      nodeHealthPopoverModel={nodeHealthPopoverModel}
      onCloseNodeHealthPopover={closeNodeHealthPopover}
      graphSearchController={graphSearchController}
      copy={copy}
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
