/** Owned concern: render the Canvas React Flow surface from an already-resolved viewport model. */
import {
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
  type AriaLabelConfig,
} from '@xyflow/react';
import type { DragEventHandler, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

import { isCanvasNodeEmbeddedControlTarget } from '../../components/canvas/canvasNodeInteractionBoundary';
import { GraphNodeHealthPopoverView } from '../../plugins/graph/GraphNodeHealthPopoverView';
import type { GraphNodeOperationalDetail } from '../../plugins/graph/graphNodeCardStrategyContracts';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { CanvasPaletteId } from './canvasPalette';
import { CanvasContextMenuView } from './CanvasContextMenuView';
import { CanvasGraphFilterControl } from './CanvasGraphFilterControl';
import { CanvasGraphSearchControl } from './CanvasGraphSearchControl';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type { CanvasGraphSearchController } from './useCanvasGraphSearchController';
import type { CanvasGraphFilterController } from './useCanvasGraphFilterController';
import { CanvasColumnLineageEdge } from './CanvasColumnLineageEdge';
import { CanvasDependencyEdge } from './CanvasDependencyEdge';

const CANVAS_FIT_VIEW_OPTIONS = { padding: 0.32, maxZoom: 0.82 } as const;
const CANVAS_EDGE_TYPES = {
  dependency: CanvasDependencyEdge,
  columnLineage: CanvasColumnLineageEdge,
} as const;

type CanvasViewportSurfaceViewProps = Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  resolvedCanvasPalette: CanvasPaletteId;
  canEditEdges: boolean;
  canDeleteWithKeyboard: boolean;
  canMoveNodes: boolean;
  canSelectNodes: boolean;
  nodesWithImpact: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  gridSize: number;
  canvasSnapToGrid: boolean;
  viewport: { x: number; y: number; zoom: number } | null;
  onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']>;
  onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  contextMenuPresenter: CanvasContextMenuPresenter;
  contextSurfaceLabel: string;
  contextMenuLabel: string;
  nodeHealthPopoverModel: {
    nodeId: string;
    detail: GraphNodeOperationalDetail;
    position: { x: number; y: number };
  } | null;
  onCloseNodeHealthPopover: (restoreTriggerFocus?: boolean) => void;
  onImpactFocusNodeChange?: (nodeId: string | null) => void;
  graphSearchController: CanvasGraphSearchController;
  graphFilterController: CanvasGraphFilterController;
  copy: CanvasViewCopy;
}>;

export function buildCanvasReactFlowAriaLabelConfig(
  copy: CanvasViewCopy
): Partial<AriaLabelConfig> {
  return {
    'node.a11yDescription.default': copy.reactFlowNodeDescription,
    'node.a11yDescription.keyboardDisabled': copy.reactFlowNodeKeyboardDisabledDescription,
    'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }) =>
      copy.reactFlowNodeMovedTemplate
        .replace('{direction}', direction)
        .replace('{x}', String(x))
        .replace('{y}', String(y)),
    'edge.a11yDescription.default': copy.reactFlowEdgeDescription,
    'controls.ariaLabel': copy.reactFlowControlsLabel,
    'controls.zoomIn.ariaLabel': copy.reactFlowZoomInLabel,
    'controls.zoomOut.ariaLabel': copy.reactFlowZoomOutLabel,
    'controls.fitView.ariaLabel': copy.reactFlowFitViewLabel,
    'controls.interactive.ariaLabel': copy.reactFlowInteractiveLabel,
    'minimap.ariaLabel': copy.reactFlowMinimapLabel,
    'handle.ariaLabel': copy.reactFlowHandleLabel,
  };
}

function resolveMiniMapNodeColor(node: { data?: unknown }): string {
  const pluginKind = (node.data as { pluginKind?: string }).pluginKind ?? 'dvt:unknown';
  return resolveNodeKindRegistration(pluginKind).minimapColor;
}

export function activateFocusedCanvasNodeFromKeyboard(
  event: Pick<
    ReactKeyboardEvent<HTMLElement>,
    'key' | 'target' | 'preventDefault' | 'stopPropagation'
  >
): boolean {
  if (event.key !== 'Enter' || isCanvasNodeEmbeddedControlTarget(event.target)) {
    return false;
  }
  if (!(event.target instanceof Element)) {
    return false;
  }

  const nodeElement = event.target.closest('.react-flow__node');
  const shell = nodeElement?.querySelector<HTMLElement>('[data-slot="canvas-node-shell"]');
  if (shell == null) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  const MouseEventConstructor =
    shell.ownerDocument.defaultView?.MouseEvent ?? globalThis.MouseEvent;
  shell.dispatchEvent(
    new MouseEventConstructor('dblclick', {
      bubbles: true,
      cancelable: true,
      detail: 2,
    })
  );
  return true;
}

function CanvasViewportReactFlowSurface({
  canEditEdges,
  canDeleteWithKeyboard,
  canMoveNodes,
  canSelectNodes,
  nodesWithImpact,
  edges,
  nodeTypes,
  gridSize,
  canvasSnapToGrid,
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onViewportChange,
  onNodeDrag,
  onNodeDragStop,
  onDrop,
  onDragOver,
  contextMenuPresenter,
  contextSurfaceLabel,
  onCloseNodeHealthPopover,
  onImpactFocusNodeChange,
  graphSearchController,
  copy,
}: Omit<
  CanvasViewportSurfaceViewProps,
  | 'viewportRef'
  | 'resolvedCanvasPalette'
  | 'contextMenuLabel'
  | 'nodeHealthPopoverModel'
  | 'graphFilterController'
>): JSX.Element {
  const handlePaneClick: NonNullable<ReactFlowProps<Node, Edge>['onPaneClick']> = (event) => {
    onCloseNodeHealthPopover();
    onImpactFocusNodeChange?.(null);
    contextMenuPresenter.handlePaneClick(event);
  };
  const handleNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onCloseNodeHealthPopover();
    onNodeDrag(event, node, nodes);
  };
  const handleNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onCloseNodeHealthPopover();
    onNodeDragStop(event, node, nodes);
  };
  const handleEdgeContextMenu: NonNullable<ReactFlowProps<Node, Edge>['onEdgeContextMenu']> = (
    event,
    edge
  ) => {
    onCloseNodeHealthPopover();
    contextMenuPresenter.handleEdgeContextMenu(event, edge);
  };

  return (
    <div
      ref={contextMenuPresenter.contextSurfaceRef}
      data-slot="canvas-viewport-context-surface"
      role="region"
      aria-label={contextSurfaceLabel}
      tabIndex={0}
      className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
      onContextMenuCapture={contextMenuPresenter.handleViewportContextMenu}
      onFocusCapture={(event) => {
        onImpactFocusNodeChange?.(
          event.target instanceof Element
            ? (event.target.closest<HTMLElement>('.react-flow__node')?.dataset.id ?? null)
            : null
        );
      }}
      onKeyDownCapture={(event) => {
        activateFocusedCanvasNodeFromKeyboard(event);
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) {
          return;
        }
        graphSearchController.onViewportKeyDown(event);
        if (!event.defaultPrevented) {
          contextMenuPresenter.handleViewportContextMenuKeyDown(event);
        }
      }}
    >
      <ReactFlow
        nodes={nodesWithImpact}
        edges={edges}
        onNodesChange={canMoveNodes ? onNodesChange : undefined}
        onEdgesChange={canEditEdges ? onEdgesChange : undefined}
        onConnect={canEditEdges ? onConnect : undefined}
        onReconnect={canEditEdges ? onReconnect : undefined}
        onPaneClick={handlePaneClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={CANVAS_EDGE_TYPES}
        nodesDraggable={canMoveNodes}
        nodesConnectable={canEditEdges}
        snapToGrid={canvasSnapToGrid}
        snapGrid={[gridSize, gridSize]}
        nodesFocusable={canSelectNodes}
        edgesFocusable={canEditEdges}
        edgesReconnectable={canEditEdges}
        elementsSelectable={canSelectNodes}
        selectNodesOnDrag
        multiSelectionKeyCode="Shift"
        deleteKeyCode={canDeleteWithKeyboard ? undefined : null}
        disableKeyboardA11y={!canSelectNodes}
        fitView={viewport == null}
        fitViewOptions={CANVAS_FIT_VIEW_OPTIONS}
        minZoom={0.35}
        defaultViewport={viewport ?? undefined}
        onMoveEnd={(event, nextViewport) => {
          if (event != null) {
            onViewportChange(nextViewport);
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeContextMenu={handleEdgeContextMenu}
        className="bg-(--canvas-surface)"
        ariaLabelConfig={buildCanvasReactFlowAriaLabelConfig(copy)}
      >
        <Controls fitViewOptions={CANVAS_FIT_VIEW_OPTIONS} />
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
  contextSurfaceLabel,
  contextMenuLabel,
  contextMenuPresenter,
  nodeHealthPopoverModel,
  onCloseNodeHealthPopover,
  graphSearchController,
  graphFilterController,
  copy,
  ...reactFlowSurfaceProps
}: CanvasViewportSurfaceViewProps): JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid="canvas-viewport"
      data-canvas-palette={resolvedCanvasPalette}
      className="relative flex-1 overflow-hidden"
    >
      <CanvasContextMenuView
        ariaLabel={contextMenuLabel}
        model={contextMenuPresenter.model}
        menuRef={contextMenuPresenter.menuRef}
        onClose={() => contextMenuPresenter.closeContextMenu({ preserveCatalog: true })}
        onCatalogClose={contextMenuPresenter.closeContextMenu}
        onCanvasAction={contextMenuPresenter.handleCanvasAction}
        onCreateNodeAction={contextMenuPresenter.handleCreateNodeAction}
        onEdgeAction={contextMenuPresenter.handleEdgeAction}
      >
        <CanvasViewportReactFlowSurface
          {...reactFlowSurfaceProps}
          contextMenuPresenter={contextMenuPresenter}
          contextSurfaceLabel={contextSurfaceLabel}
          onCloseNodeHealthPopover={onCloseNodeHealthPopover}
          graphSearchController={graphSearchController}
          copy={copy}
        />
      </CanvasContextMenuView>
      <CanvasGraphSearchControl
        model={graphSearchController.model}
        copy={copy}
        onQueryChange={graphSearchController.setQuery}
        onPrevious={graphSearchController.showPrevious}
        onNext={graphSearchController.showNext}
        onClose={graphSearchController.close}
        onKeyDown={graphSearchController.onControlKeyDown}
        onQueryKeyDown={graphSearchController.onQueryKeyDown}
      />
      <CanvasGraphFilterControl
        model={graphFilterController.model}
        copy={copy}
        onOpenChange={graphFilterController.setOpen}
        onSelectDimension={graphFilterController.selectDimension}
        onSelectValue={graphFilterController.selectValue}
        onAddPredicate={graphFilterController.addDraftPredicate}
        onRemovePredicate={graphFilterController.removePredicate}
        onSetComposition={graphFilterController.setComposition}
        onSetPresentation={graphFilterController.setPresentation}
        onClear={graphFilterController.clear}
      />
      {nodeHealthPopoverModel == null ? null : (
        <GraphNodeHealthPopoverView
          detail={nodeHealthPopoverModel.detail}
          position={nodeHealthPopoverModel.position}
          onClose={() => onCloseNodeHealthPopover(true)}
        />
      )}
    </div>
  );
}

export type { CanvasViewportSurfaceViewProps };
