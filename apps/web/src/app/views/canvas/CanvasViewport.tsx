/** Owned concern: orchestrate the Canvas viewport presenter, lifecycle, and presentation view. */
import {
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useReducer, useRef, type DragEventHandler } from 'react';

import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { normalizeCanvasPaletteId, type CanvasPaletteId } from './canvasPalette';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import { projectCanvasGraphFilterPresentation } from './canvasGraphFilterPresentation';
import { projectCanvasGraphSearchPresentation } from './canvasGraphSearchPresentation';
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
import { useCanvasGraphSearchActivation } from './useCanvasGraphSearchActivation';
import { useCanvasGraphFilterController } from './useCanvasGraphFilterController';
import { useCanvasGraphSearchController } from './useCanvasGraphSearchController';
import { useCanvasViewportLifecycle } from './useCanvasViewportLifecycle';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasEdgeCommandRunner } from './useCanvasEdgeCommandRunner';

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
  readonly onSetEdgeExecutionGate?: CanvasEdgeCommandRunner['setExecutionGate'];
  readonly onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  readonly onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
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
  readonly onImpactFocusNodeChange?: (nodeId: string | null) => void;
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
  }>;

function CanvasViewportWithPresenter({
  contextMenuPresenter,
  ...props
}: CanvasViewportWithPresenterProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const canSelectNodes = props.canSelectNodes ?? props.canEditEdges;
  const graphSearchActivationPort = useMemo(
    () => ({ fitView: reactFlow.fitView, onNodesChange: props.onNodesChange }),
    [props.onNodesChange, reactFlow.fitView]
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const [nodeContextSurfaceState, dispatchNodeContextSurface] = useReducer(
    reduceCanvasNodeContextSurface,
    undefined,
    createCanvasNodeContextSurfaceState
  );
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
        const openSourceDataSample =
          typeof nodeData.onOpenSourceDataSample === 'function'
            ? (nodeData.onOpenSourceDataSample as (...args: unknown[]) => void)
            : null;
        return {
          ...node,
          data: {
            ...node.data,
            ...(inspectNode == null
              ? {}
              : {
                  onInspectNode: (...args: unknown[]) => {
                    closeNodeHealthPopover();
                    inspectNode(...args);
                  },
                }),
            ...(openSourceDataSample == null
              ? {}
              : {
                  onOpenSourceDataSample: (...args: unknown[]) => {
                    closeNodeHealthPopover(false);
                    openSourceDataSample(...args);
                  },
                }),
            onOpenOperationalDetails: (
              detail: GraphNodeOperationalDetail,
              anchorElement: HTMLElement
            ) => openNodeHealthPopover(node.id, detail, anchorElement),
          },
        };
      }),
    [closeNodeHealthPopover, openNodeHealthPopover, props.nodesWithImpact]
  );

  const graphFilterController = useCanvasGraphFilterController({
    nodes: nodesWithOperationalDetails,
  });
  const getTagFilterLabel = useCallback(
    (tag: string) => formatCanvasCopyTemplate(copy.canvasGraphFilterByTagLabelTemplate, { tag }),
    [copy.canvasGraphFilterByTagLabelTemplate]
  );
  const nodesWithTagFilterIntent = useMemo(
    () =>
      nodesWithOperationalDetails.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onFilterByTag: graphFilterController.filterByTag,
          getTagFilterLabel,
        },
      })),
    [getTagFilterLabel, graphFilterController.filterByTag, nodesWithOperationalDetails]
  );
  const graphFilterPresentation = useMemo(
    () =>
      projectCanvasGraphFilterPresentation({
        nodes: nodesWithTagFilterIntent,
        edges: props.edges,
        result: graphFilterController.result,
      }),
    [graphFilterController.result, nodesWithTagFilterIntent, props.edges]
  );
  const graphFilterMatchingNodeIds = useMemo(
    () => new Set(graphFilterController.result.matchingNodeIds),
    [graphFilterController.result.matchingNodeIds]
  );
  const graphSearchNodes = useMemo(
    () =>
      graphFilterController.result.status === 'idle'
        ? nodesWithTagFilterIntent
        : nodesWithTagFilterIntent.filter((node) => graphFilterMatchingNodeIds.has(node.id)),
    [graphFilterController.result.status, graphFilterMatchingNodeIds, nodesWithTagFilterIntent]
  );
  const graphSearchController = useCanvasGraphSearchController({ nodes: graphSearchNodes });

  const graphSearchPresentation = useMemo(
    () =>
      projectCanvasGraphSearchPresentation({
        nodes: graphFilterPresentation.nodes,
        edges: graphFilterPresentation.edges,
        status: graphSearchController.model.status,
        matchingNodeIds: graphSearchController.matchingNodeIds,
        activeNodeId: graphSearchController.model.activeNodeId,
      }),
    [
      graphSearchController.matchingNodeIds,
      graphSearchController.model.activeNodeId,
      graphSearchController.model.status,
      graphFilterPresentation.edges,
      graphFilterPresentation.nodes,
    ]
  );

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

  useCanvasGraphSearchActivation({
    activeNodeId: graphSearchController.model.activeNodeId,
    nodes: props.nodesWithImpact,
    canSelectNodes,
    port: graphSearchActivationPort,
  });

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
      canDeleteWithKeyboard={props.canEditEdges && !(props.externalNodeSurfaceActive ?? false)}
      canMoveNodes={props.canMoveNodes ?? props.canEditEdges}
      canSelectNodes={canSelectNodes}
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
      onViewportChange={props.onViewportChange}
      onNodeDrag={props.onNodeDrag}
      onNodeDragStop={props.onNodeDragStop}
      onDrop={props.onDrop}
      onDragOver={props.onDragOver}
      contextMenuPresenter={contextMenuPresenter}
      contextSurfaceLabel={copy.canvasViewportContextSurfaceLabel}
      contextMenuLabel={copy.canvasContextMenuLabel}
      nodeHealthPopoverModel={nodeHealthPopoverModel}
      onCloseNodeHealthPopover={closeNodeHealthPopover}
      onImpactFocusNodeChange={props.onImpactFocusNodeChange}
      graphSearchController={graphSearchController}
      graphFilterController={graphFilterController}
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
    onSetEdgeExecutionGate: props.onSetEdgeExecutionGate,
    onOpenSourceImport: props.onOpenSourceImport,
    onOpenCanvasSettings: props.onOpenCanvasSettings,
  });

  return <CanvasViewportWithPresenter {...props} contextMenuPresenter={contextMenuPresenter} />;
}

export default function CanvasViewport(props: CanvasViewportProps): JSX.Element {
  if (props.contextMenuPresenter != null) {
    return (
      <CanvasViewportWithPresenter {...props} contextMenuPresenter={props.contextMenuPresenter} />
    );
  }

  return <CanvasViewportLocalPresenter {...props} />;
}

export type { CanvasViewportProps };
