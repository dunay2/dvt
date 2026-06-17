/** Owned concern: render the Canvas viewport over React Flow and forward governed gesture callbacks only. */
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';

import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import {
  deriveCanvasPaletteTokens,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from './canvasPalette';
import { CanvasContextMenuView } from './CanvasContextMenuView';
import type { CreateCanvasAuthoringNode } from './canvasGraphHandlerContracts';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';

function resolveCanvasViewportStyle(
  canvasPalette: CanvasPaletteId,
  gridSize: number
): CSSProperties {
  const tokens = deriveCanvasPaletteTokens(canvasPalette);

  return {
    '--canvas-surface': tokens.surface,
    '--canvas-grid': tokens.grid,
    '--canvas-controls-surface': tokens.controlsSurface,
    '--canvas-controls-button-surface': tokens.controlsButtonSurface,
    '--canvas-controls-button-hover': tokens.controlsButtonHover,
    '--canvas-controls-border': tokens.controlsBorder,
    '--canvas-controls-foreground': tokens.controlsForeground,
    '--canvas-minimap-surface': tokens.minimapSurface,
    '--canvas-minimap-border': tokens.minimapBorder,
    '--canvas-minimap-mask': tokens.minimapMask,
    '--canvas-minimap-mask-stroke': tokens.minimapMaskStroke,
    '--canvas-panel-toggle-surface': tokens.panelToggleSurface,
    '--canvas-panel-toggle-hover': tokens.panelToggleHover,
    '--canvas-panel-toggle-border': tokens.panelToggleBorder,
    '--canvas-panel-toggle-foreground': tokens.panelToggleForeground,
    '--canvas-grid-gap': `${gridSize}px`,
  } as CSSProperties;
}

function applyCanvasViewportStyle(element: HTMLDivElement, canvasStyle: CSSProperties): void {
  for (const [property, value] of Object.entries(canvasStyle)) {
    if (typeof value !== 'string') {
      continue;
    }

    element.style.setProperty(property, value);
  }
}

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
  readonly onDrop: React.DragEventHandler<HTMLDivElement>;
  readonly onDragOver: React.DragEventHandler<HTMLDivElement>;
  readonly authoringNodeKinds: readonly NodeKindRegistration[];
  readonly onCreateAuthoringNode: CreateCanvasAuthoringNode;
  readonly importedNodeFocusIds: string[];
  readonly onImportedNodeFocusComplete: () => void;
  readonly canOpenSourceImport?: boolean;
  readonly onOpenSourceImport?: (flowPosition?: { x: number; y: number }) => void;
  readonly canOpenProjectExplorer?: boolean;
  readonly onOpenProjectExplorer?: () => void;
  readonly canPreviewExecutionPlan?: boolean;
  readonly onPreviewExecutionPlan?: () => void;
  readonly canOpenCanvasSettings?: boolean;
  readonly onOpenCanvasSettings?: () => void;
};

type CanvasViewportLifecycleArgs = Readonly<{
  viewportRef: RefObject<HTMLDivElement>;
  canvasStyle: CSSProperties;
  viewport: CanvasViewportProps['viewport'];
  importedNodeFocusIds: CanvasViewportProps['importedNodeFocusIds'];
  nodesWithImpact: CanvasViewportProps['nodesWithImpact'];
  onImportedNodeFocusComplete: CanvasViewportProps['onImportedNodeFocusComplete'];
  reactFlow: ReturnType<typeof useReactFlow<Node, Edge>>;
}>;

function useCanvasViewportLifecycle({
  viewportRef,
  canvasStyle,
  viewport,
  importedNodeFocusIds,
  nodesWithImpact,
  onImportedNodeFocusComplete,
  reactFlow,
}: CanvasViewportLifecycleArgs): void {
  useEffect(() => {
    if (viewportRef.current == null) {
      return;
    }

    applyCanvasViewportStyle(viewportRef.current, canvasStyle);
  }, [canvasStyle]);

  useEffect(() => {
    if (viewport == null) {
      return;
    }

    reactFlow.setViewport(viewport, { duration: 0 }).catch(() => undefined);
  }, [reactFlow, viewport]);

  useEffect(() => {
    if (importedNodeFocusIds.length === 0) {
      return;
    }

    const importedNodeIdSet = new Set(importedNodeFocusIds);
    const focusNodes = nodesWithImpact.filter((node) => importedNodeIdSet.has(node.id));
    if (focusNodes.length === 0) {
      return;
    }

    reactFlow
      .fitView({
        nodes: focusNodes,
        padding: 0.24,
        maxZoom: 0.9,
        duration: 300,
      })
      .catch(() => undefined);
    onImportedNodeFocusComplete();
  }, [importedNodeFocusIds, nodesWithImpact, onImportedNodeFocusComplete, reactFlow]);
}

function resolveMiniMapNodeColor(node: { data?: unknown }): string {
  const pluginKind = (node.data as { pluginKind?: string }).pluginKind ?? 'dvt:unknown';
  return resolveNodeKindRegistration(pluginKind).minimapColor;
}

type CanvasViewportReactFlowSurfaceProps = Readonly<
  Pick<
    CanvasViewportProps,
    | 'canEditEdges'
    | 'nodesWithImpact'
    | 'edges'
    | 'nodeTypes'
    | 'gridSize'
    | 'canvasGridVisible'
    | 'canvasGridColor'
    | 'canvasSnapToGrid'
    | 'viewport'
    | 'onNodesChange'
    | 'onEdgesChange'
    | 'onConnect'
    | 'onReconnect'
    | 'onNodeClick'
    | 'onSelectionChange'
    | 'onViewportChange'
    | 'onNodeDrag'
    | 'onNodeDragStop'
    | 'onDrop'
    | 'onDragOver'
    | 'authoringNodeKinds'
    | 'onCreateAuthoringNode'
    | 'canOpenSourceImport'
    | 'onOpenSourceImport'
    | 'canOpenProjectExplorer'
    | 'onOpenProjectExplorer'
    | 'canPreviewExecutionPlan'
    | 'onPreviewExecutionPlan'
    | 'canOpenCanvasSettings'
    | 'onOpenCanvasSettings'
  >
>;

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
  authoringNodeKinds,
  onCreateAuthoringNode,
  canOpenSourceImport,
  onOpenSourceImport,
  canOpenProjectExplorer,
  onOpenProjectExplorer,
  canPreviewExecutionPlan,
  onPreviewExecutionPlan,
  canOpenCanvasSettings,
  onOpenCanvasSettings,
}: CanvasViewportReactFlowSurfaceProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges,
    canOpenSourceImport,
    canOpenProjectExplorer,
    authoringNodeKinds,
    screenToFlowPosition: (screenPosition) => reactFlow.screenToFlowPosition(screenPosition),
    onCreateAuthoringNode,
    onEdgesChange,
    onOpenSourceImport,
    onOpenProjectExplorer,
    canPreviewExecutionPlan,
    onPreviewExecutionPlan,
    canOpenCanvasSettings,
    onOpenCanvasSettings,
  });

  const handlePaneClick: NonNullable<ReactFlowProps<Node, Edge>['onPaneClick']> = (event) => {
    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }

    contextMenuPresenter.closeContextMenu();
  };
  const handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']> = (event, node) => {
    contextMenuPresenter.closeContextMenu();
    onNodeClick(event, node);
  };
  const handleSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']> = (
    selection
  ) => {
    contextMenuPresenter.closeContextMenu();
    onSelectionChange(selection);
  };
  const handleNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onNodeDrag(event, node, nodes);
  };
  const handleNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']> = (
    event,
    node,
    nodes
  ) => {
    contextMenuPresenter.closeContextMenu();
    onNodeDragStop(event, node, nodes);
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
        onPaneContextMenu={contextMenuPresenter.handlePaneContextMenu}
        onEdgeContextMenu={contextMenuPresenter.handleEdgeContextMenu}
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
      <CanvasContextMenuView
        model={contextMenuPresenter.model}
        menuRef={contextMenuPresenter.menuRef}
        onCanvasAction={contextMenuPresenter.handleCanvasAction}
        onCreateNodeAction={contextMenuPresenter.handleCreateNodeAction}
        onEdgeAction={contextMenuPresenter.handleEdgeAction}
      />
    </div>
  );
}

type CanvasViewportSurfaceProps = Readonly<
  Omit<
    CanvasViewportProps,
    'canvasPalette' | 'importedNodeFocusIds' | 'onImportedNodeFocusComplete'
  > & {
    viewportRef: RefObject<HTMLDivElement>;
    resolvedCanvasPalette: CanvasPaletteId;
  }
>;

function CanvasViewportSurface({
  viewportRef,
  resolvedCanvasPalette,
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
  authoringNodeKinds,
  onCreateAuthoringNode,
  canOpenSourceImport,
  onOpenSourceImport,
  canOpenProjectExplorer,
  onOpenProjectExplorer,
  canPreviewExecutionPlan,
  onPreviewExecutionPlan,
  canOpenCanvasSettings,
  onOpenCanvasSettings,
}: CanvasViewportSurfaceProps): JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid="canvas-viewport"
      data-canvas-palette={resolvedCanvasPalette}
      className="relative flex-1 overflow-hidden"
    >
      <CanvasViewportReactFlowSurface
        canEditEdges={canEditEdges}
        nodesWithImpact={nodesWithImpact}
        edges={edges}
        nodeTypes={nodeTypes}
        gridSize={gridSize}
        canvasGridVisible={canvasGridVisible}
        canvasGridColor={canvasGridColor}
        canvasSnapToGrid={canvasSnapToGrid}
        viewport={viewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onViewportChange={onViewportChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        authoringNodeKinds={authoringNodeKinds}
        onCreateAuthoringNode={onCreateAuthoringNode}
        canOpenSourceImport={canOpenSourceImport}
        onOpenSourceImport={onOpenSourceImport}
        canOpenProjectExplorer={canOpenProjectExplorer}
        onOpenProjectExplorer={onOpenProjectExplorer}
        canPreviewExecutionPlan={canPreviewExecutionPlan}
        onPreviewExecutionPlan={onPreviewExecutionPlan}
        canOpenCanvasSettings={canOpenCanvasSettings}
        onOpenCanvasSettings={onOpenCanvasSettings}
      />
    </div>
  );
}

export default function CanvasViewport(props: CanvasViewportProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const viewportRef = useRef<HTMLDivElement>(null);
  const resolvedCanvasPalette = normalizeCanvasPaletteId(props.canvasPalette);
  const canvasStyle = resolveCanvasViewportStyle(resolvedCanvasPalette, props.gridSize);

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
    <CanvasViewportSurface
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
      onNodeClick={props.onNodeClick}
      onSelectionChange={props.onSelectionChange}
      onViewportChange={props.onViewportChange}
      onNodeDrag={props.onNodeDrag}
      onNodeDragStop={props.onNodeDragStop}
      onDrop={props.onDrop}
      onDragOver={props.onDragOver}
      authoringNodeKinds={props.authoringNodeKinds}
      onCreateAuthoringNode={props.onCreateAuthoringNode}
      canOpenSourceImport={props.canOpenSourceImport}
      onOpenSourceImport={props.onOpenSourceImport}
      canOpenProjectExplorer={props.canOpenProjectExplorer}
      onOpenProjectExplorer={props.onOpenProjectExplorer}
      canPreviewExecutionPlan={props.canPreviewExecutionPlan}
      onPreviewExecutionPlan={props.onPreviewExecutionPlan}
      canOpenCanvasSettings={props.canOpenCanvasSettings}
      onOpenCanvasSettings={props.onOpenCanvasSettings}
    />
  );
}
