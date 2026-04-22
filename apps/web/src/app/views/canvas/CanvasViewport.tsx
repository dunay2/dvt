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
import { useEffect, type CSSProperties } from 'react';

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

export default function CanvasViewport({
  focusMode,
  explorerPanelVisible,
  inspectorPanelVisible,
  canEditEdges,
  nodesWithImpact,
  edges,
  nodeTypes,
  gridSize,
  canvasPalette,
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onNodeDragStop,
  onDrop,
  onDragOver,
  importedNodeFocusIds,
  onImportedNodeFocusComplete,
  onShowExplorer,
  onShowInspector,
}: CanvasViewportProps) {
  const reactFlow = useReactFlow<Node, Edge>();
  const resolvedCanvasPalette = normalizeCanvasPaletteId(canvasPalette);
  const canvasStyle = resolveCanvasViewportStyle(resolvedCanvasPalette, gridSize);

  useEffect(() => {
    if (viewport == null) {
      return;
    }

    void reactFlow.setViewport(viewport, { duration: 0 });
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

    void reactFlow.fitView({
      nodes: focusNodes,
      padding: 0.24,
      maxZoom: 0.9,
      duration: 300,
    });
    onImportedNodeFocusComplete();
  }, [importedNodeFocusIds, nodesWithImpact, onImportedNodeFocusComplete, reactFlow]);

  return (
    <div
      data-testid="canvas-viewport"
      data-canvas-palette={resolvedCanvasPalette}
      className="relative flex-1 overflow-hidden"
      style={canvasStyle}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {!focusMode && !explorerPanelVisible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          style={{
            backgroundColor: 'var(--canvas-panel-toggle-surface)',
            borderColor: 'var(--canvas-panel-toggle-border)',
            color: 'var(--canvas-panel-toggle-foreground)',
          }}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 hover:bg-[var(--canvas-panel-toggle-hover)]"
          onClick={onShowExplorer}
          aria-label="Show explorer panel"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}

      {!focusMode && !inspectorPanelVisible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          style={{
            backgroundColor: 'var(--canvas-panel-toggle-surface)',
            borderColor: 'var(--canvas-panel-toggle-border)',
            color: 'var(--canvas-panel-toggle-foreground)',
          }}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 hover:bg-[var(--canvas-panel-toggle-hover)]"
          onClick={onShowInspector}
          aria-label="Show inspector panel"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      )}

      <ReactFlow
        nodes={nodesWithImpact}
        edges={edges}
        onNodesChange={canEditEdges ? onNodesChange : undefined}
        onEdgesChange={canEditEdges ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        nodesDraggable={canEditEdges}
        nodesConnectable={canEditEdges}
        nodesFocusable={canEditEdges}
        edgesFocusable={canEditEdges}
        elementsSelectable={canEditEdges}
        deleteKeyCode={canEditEdges ? undefined : null}
        disableKeyboardA11y={!canEditEdges}
        fitView={viewport == null}
        fitViewOptions={{ padding: 0.2, maxZoom: 0.82 }}
        minZoom={0.35}
        defaultViewport={viewport ?? undefined}
        onMoveEnd={(_event, nextViewport) => onViewportChange(nextViewport)}
        className="bg-[var(--canvas-surface)]"
      >
        <Controls />
        <MiniMap
          pannable
          zoomable
          style={{ borderRadius: 8 }}
          maskColor="var(--canvas-minimap-mask)"
          maskStrokeColor="var(--canvas-minimap-mask-stroke)"
          maskStrokeWidth={3}
          nodeColor={(node) => {
            const pluginKind = (node.data as { pluginKind?: string }).pluginKind ?? 'dvt:unknown';
            return resolveNodeKindRegistration(pluginKind).minimapColor;
          }}
          nodeBorderRadius={4}
        />
      </ReactFlow>
    </div>
  );
}
