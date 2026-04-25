/** Owned concern: render the Canvas viewport over React Flow and forward governed gesture callbacks only. */
import {
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';

import { Button } from '../../components/ui/button';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import {
  deriveCanvasPaletteTokens,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from './canvasPalette';

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

function applyCanvasViewportStyle(
  element: HTMLDivElement,
  canvasStyle: CSSProperties
): void {
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
  readonly viewport: { x: number; y: number; zoom: number } | null;
  readonly onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  readonly onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  readonly onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  readonly onReconnect: NonNullable<ReactFlowProps<Node, Edge>['onReconnect']>;
  readonly onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  readonly onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  readonly onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  readonly onNodeDragStop: NonNullable<ReactFlowProps<Node, Edge>['onNodeDragStop']>;
  readonly onDrop: React.DragEventHandler<HTMLDivElement>;
  readonly onDragOver: React.DragEventHandler<HTMLDivElement>;
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

type CanvasViewportRestoreControlsProps = Readonly<
  Pick<
    CanvasViewportProps,
    'focusMode' | 'explorerPanelVisible' | 'inspectorPanelVisible' | 'onShowExplorer' | 'onShowInspector'
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
    | 'viewport'
    | 'onNodesChange'
    | 'onEdgesChange'
    | 'onConnect'
    | 'onReconnect'
    | 'onNodeClick'
    | 'onSelectionChange'
    | 'onViewportChange'
    | 'onNodeDragStop'
    | 'onDrop'
    | 'onDragOver'
  >
>;

function CanvasViewportReactFlowSurface({
  canEditEdges,
  nodesWithImpact,
  edges,
  nodeTypes,
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onNodeDragStop,
  onDrop,
  onDragOver,
}: CanvasViewportReactFlowSurfaceProps): JSX.Element {
  return (
    <ReactFlow
      nodes={nodesWithImpact}
      edges={edges}
      onNodesChange={canEditEdges ? onNodesChange : undefined}
      onEdgesChange={canEditEdges ? onEdgesChange : undefined}
      onConnect={onConnect}
      onReconnect={canEditEdges ? onReconnect : undefined}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      onSelectionChange={onSelectionChange}
      nodeTypes={nodeTypes}
      nodesDraggable={canEditEdges}
      nodesConnectable={canEditEdges}
      nodesFocusable={canEditEdges}
      edgesFocusable={canEditEdges}
      edgesReconnectable={canEditEdges}
      elementsSelectable={canEditEdges}
      multiSelectionKeyCode="Shift"
      deleteKeyCode={canEditEdges ? undefined : null}
      disableKeyboardA11y={!canEditEdges}
      fitView={viewport == null}
      fitViewOptions={{ padding: 0.2, maxZoom: 0.82 }}
      minZoom={0.35}
      defaultViewport={viewport ?? undefined}
      onMoveEnd={(_event, nextViewport) => onViewportChange(nextViewport)}
      onDrop={onDrop}
      onDragOver={onDragOver}
      className="bg-(--canvas-surface)"
    >
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
  Omit<CanvasViewportProps, 'gridSize' | 'canvasPalette' | 'importedNodeFocusIds' | 'onImportedNodeFocusComplete'> & {
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
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onNodeDragStop,
  onDrop,
  onDragOver,
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
        viewport={viewport}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onViewportChange={onViewportChange}
        onNodeDragStop={onNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
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
      viewport={props.viewport}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      onReconnect={props.onReconnect}
      onNodeClick={props.onNodeClick}
      onSelectionChange={props.onSelectionChange}
      onViewportChange={props.onViewportChange}
      onNodeDragStop={props.onNodeDragStop}
      onDrop={props.onDrop}
      onDragOver={props.onDragOver}
      onShowExplorer={props.onShowExplorer}
      onShowInspector={props.onShowInspector}
    />
  );
}
