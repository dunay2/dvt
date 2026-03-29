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
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';

type CanvasViewportProps = {
  readonly focusMode: boolean;
  readonly explorerPanelVisible: boolean;
  readonly inspectorPanelVisible: boolean;
  readonly nodesWithImpact: Node[];
  readonly edges: Edge[];
  readonly nodeTypes: NodeTypes;
  readonly gridSize: number;
  readonly viewport: { x: number; y: number; zoom: number } | null;
  readonly onNodesChange: NonNullable<ReactFlowProps<Node, Edge>['onNodesChange']>;
  readonly onEdgesChange: NonNullable<ReactFlowProps<Node, Edge>['onEdgesChange']>;
  readonly onConnect: NonNullable<ReactFlowProps<Node, Edge>['onConnect']>;
  readonly onNodeClick: NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>;
  readonly onSelectionChange: NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>;
  readonly onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  readonly onDrop: React.DragEventHandler<HTMLDivElement>;
  readonly onDragOver: React.DragEventHandler<HTMLDivElement>;
  readonly onShowExplorer: () => void;
  readonly onShowInspector: () => void;
};

export default function CanvasViewport({
  focusMode,
  explorerPanelVisible,
  inspectorPanelVisible,
  nodesWithImpact,
  edges,
  nodeTypes,
  gridSize,
  viewport,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onSelectionChange,
  onViewportChange,
  onDrop,
  onDragOver,
  onShowExplorer,
  onShowInspector,
}: CanvasViewportProps) {
  return (
    <div className="flex-1 relative overflow-hidden" onDrop={onDrop} onDragOver={onDragOver}>
      {!focusMode && !explorerPanelVisible && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 border-slate-600 text-slate-50 hover:bg-slate-950"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 border-slate-600 text-slate-50 hover:bg-slate-950"
          onClick={onShowInspector}
          aria-label="Show inspector panel"
        >
          <PanelRightOpen className="size-4" />
        </Button>
      )}

      <ReactFlow
        nodes={nodesWithImpact}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView={viewport == null}
        fitViewOptions={{ padding: 0.2, maxZoom: 0.82 }}
        minZoom={0.35}
        defaultViewport={viewport ?? undefined}
        onMoveEnd={(_event, nextViewport) => onViewportChange(nextViewport)}
        className="bg-slate-950"
      >
        <Background color="#374151" gap={gridSize} />
        <Controls className="bg-slate-900 border-slate-600" />
        <MiniMap
          pannable
          zoomable
          style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
          maskColor="rgba(2, 6, 23, 0.65)"
          maskStrokeColor="#475569"
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
