/** Owned concern: render the Canvas viewport over React Flow and forward governed gesture callbacks only. */
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

import { Button } from '../../components/ui/button';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import {
  deriveCanvasPaletteTokens,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from './canvasPalette';
import {
  buildCanvasContextMenuModel,
  buildCanvasEdgeContextRemovalChange,
  type CanvasContextMenuModel,
} from './canvasInteractionCommandSurface';

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

const CANVAS_PANEL_TOGGLE_BUTTON_CLASS_NAME =
  'absolute top-1/2 z-10 -translate-y-1/2 bg-(--canvas-panel-toggle-surface) border-(--canvas-panel-toggle-border) text-(--canvas-panel-toggle-foreground) hover:bg-(--canvas-panel-toggle-hover)';

type CanvasViewportProps = {
  readonly focusMode: boolean;
  readonly explorerPanelVisible: boolean;
  readonly inspectorPanelVisible: boolean;
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
  readonly onCreateAuthoringNode: (
    registration: NodeKindRegistration,
    position?: { x: number; y: number }
  ) => void;
  readonly importedNodeFocusIds: string[];
  readonly onImportedNodeFocusComplete: () => void;
  readonly onShowExplorer: () => void;
  readonly onShowInspector: () => void;
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

type CanvasViewportPanelToggleButtonProps = Readonly<{
  sideClassName: 'left-2' | 'right-2';
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
}>;

function CanvasViewportPanelToggleButton({
  sideClassName,
  ariaLabel,
  onClick,
  children,
}: CanvasViewportPanelToggleButtonProps): JSX.Element {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`${CANVAS_PANEL_TOGGLE_BUTTON_CLASS_NAME} ${sideClassName}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

type CanvasViewportContextMenuProps = Readonly<{
  model: CanvasContextMenuModel | null;
  menuRef: RefObject<HTMLDivElement>;
  onCreateAuthoringNode: CanvasViewportProps['onCreateAuthoringNode'];
  onEdgesChange: CanvasViewportProps['onEdgesChange'];
  onClose: () => void;
}>;

function CanvasViewportContextMenu({
  model,
  menuRef,
  onCreateAuthoringNode,
  onEdgesChange,
  onClose,
}: CanvasViewportContextMenuProps): JSX.Element | null {
  if (model == null) {
    return null;
  }

  const menuStyle: CSSProperties = {
    left: model.screenPosition.x,
    top: model.screenPosition.y,
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      data-slot="canvas-context-menu"
      className="fixed z-50 min-w-52 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] p-1 shadow-xl"
      style={menuStyle}
      onContextMenu={(event) => event.preventDefault()}
    >
      {model.createNodeActions.length > 0 ? (
        <div>
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-(--text-muted)">
            Crear nodo
          </div>
          {model.createNodeActions.map((action) => (
            <button
              key={action.registration.kind}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
              onClick={() => {
                onCreateAuthoringNode(action.registration, model.flowPosition);
                onClose();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {model.edgeActions.map((action) => (
        <button
          key={action.action}
          type="button"
          role="menuitem"
          className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-(--text-default) hover:bg-(--surface-elevated)"
          onClick={() => {
            if (model.edgeId != null) {
              onEdgesChange([buildCanvasEdgeContextRemovalChange({ id: model.edgeId })]);
            }
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

type CanvasViewportRestoreControlsProps = Readonly<
  Pick<
    CanvasViewportProps,
    | 'focusMode'
    | 'explorerPanelVisible'
    | 'inspectorPanelVisible'
    | 'onShowExplorer'
    | 'onShowInspector'
  >
>;

function CanvasViewportRestoreControls({
  focusMode,
  explorerPanelVisible,
  inspectorPanelVisible,
  onShowExplorer,
  onShowInspector,
}: CanvasViewportRestoreControlsProps): JSX.Element {
  const showExplorerRestore = !focusMode && !explorerPanelVisible;
  const showInspectorRestore = !focusMode && !inspectorPanelVisible;

  return (
    <>
      {showExplorerRestore ? (
        <CanvasViewportPanelToggleButton
          sideClassName="left-2"
          ariaLabel="Show explorer panel"
          onClick={onShowExplorer}
        >
          <PanelLeftOpen className="size-4" />
        </CanvasViewportPanelToggleButton>
      ) : null}

      {showInspectorRestore ? (
        <CanvasViewportPanelToggleButton
          sideClassName="right-2"
          ariaLabel="Show inspector panel"
          onClick={onShowInspector}
        >
          <PanelRightOpen className="size-4" />
        </CanvasViewportPanelToggleButton>
      ) : null}
    </>
  );
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
}: CanvasViewportReactFlowSurfaceProps): JSX.Element {
  const reactFlow = useReactFlow<Node, Edge>();
  const [contextMenuModel, setContextMenuModel] = useState<CanvasContextMenuModel | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const closeContextMenu = () => setContextMenuModel(null);

  useEffect(() => {
    if (contextMenuModel == null) {
      return;
    }

    const handleDocumentPointerDown = (event: Event): void => {
      const target = event.target;
      if (target instanceof Node && contextMenuRef.current?.contains(target)) {
        return;
      }

      closeContextMenu();
    };
    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('keydown', handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [contextMenuModel]);

  const handlePaneClick: NonNullable<ReactFlowProps<Node, Edge>['onPaneClick']> = () => {
    closeContextMenu();
  };
  const handleNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']> = (event, node) => {
    closeContextMenu();
    onNodeClick(event, node);
  };
  const handleSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']> = (
    selection
  ) => {
    closeContextMenu();
    onSelectionChange(selection);
  };
  const handleNodeDrag: NonNullable<ReactFlowProps<Node, Edge>['onNodeDrag']> = (
    event,
    node,
    nodes
  ) => {
    closeContextMenu();
    onNodeDrag(event, node, nodes);
  };
  const handleNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']> = (
    event,
    node,
    nodes
  ) => {
    closeContextMenu();
    onNodeDragStop(event, node, nodes);
  };
  const handlePaneContextMenu: NonNullable<ReactFlowProps<Node, Edge>['onPaneContextMenu']> = (
    event
  ) => {
    event.preventDefault();
    const screenPosition = { x: event.clientX, y: event.clientY };
    const flowPosition = reactFlow.screenToFlowPosition(screenPosition);

    setContextMenuModel(
      buildCanvasContextMenuModel({
        target: {
          kind: 'pane',
          screenPosition,
          flowPosition,
        },
        canMutateGraph: canEditEdges,
        authoringNodeKinds,
      })
    );
  };
  const handleEdgeContextMenu: NonNullable<ReactFlowProps<Node, Edge>['onEdgeContextMenu']> = (
    event,
    edge
  ) => {
    event.preventDefault();
    setContextMenuModel(
      buildCanvasContextMenuModel({
        target: {
          kind: 'edge',
          edgeId: edge.id,
          screenPosition: { x: event.clientX, y: event.clientY },
        },
        canMutateGraph: canEditEdges,
        authoringNodeKinds,
      })
    );
  };

  return (
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
      <CanvasViewportContextMenu
        model={contextMenuModel}
        menuRef={contextMenuRef}
        onCreateAuthoringNode={onCreateAuthoringNode}
        onEdgesChange={(changes: EdgeChange<Edge>[]) => onEdgesChange(changes)}
        onClose={closeContextMenu}
      />
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
  focusMode,
  explorerPanelVisible,
  inspectorPanelVisible,
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
  onShowExplorer,
  onShowInspector,
}: CanvasViewportSurfaceProps): JSX.Element {
  return (
    <div
      ref={viewportRef}
      data-testid="canvas-viewport"
      data-canvas-palette={resolvedCanvasPalette}
      className="relative flex-1 overflow-hidden"
    >
      <CanvasViewportRestoreControls
        focusMode={focusMode}
        explorerPanelVisible={explorerPanelVisible}
        inspectorPanelVisible={inspectorPanelVisible}
        onShowExplorer={onShowExplorer}
        onShowInspector={onShowInspector}
      />

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
      focusMode={props.focusMode}
      explorerPanelVisible={props.explorerPanelVisible}
      inspectorPanelVisible={props.inspectorPanelVisible}
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
      onShowExplorer={props.onShowExplorer}
      onShowInspector={props.onShowInspector}
    />
  );
}
