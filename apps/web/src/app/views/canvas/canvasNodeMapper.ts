/** Owned concern: project canonical graph primitives into React Flow nodes and edges. */
import { MarkerType, type Edge, type Node } from '@xyflow/react';

import { resolveNodeKindRegistration } from '../../plugins/nodeTypeRegistry';
import type { MergedNodeDecoration } from '../../plugins/contracts/NodeRendering';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';

export const CANVAS_NODE_DRAG_HANDLE_SELECTOR = '.canvas-node-drag-handle';

type ColumnMeta = Array<{ name: string; type: string }>;
type CanvasNodePosition = { x: number; y: number };
type MapCanonicalNodeToCanvasNodeArgs = {
  canonicalNode: CanonicalNode;
  index: number;
  showColumns: boolean;
  overlayDecoration?: MergedNodeDecoration | null;
  persistedPosition?: CanvasNodePosition;
};

function resolveColumns(value: unknown): ColumnMeta | undefined {
  return Array.isArray(value) ? (value as ColumnMeta) : undefined;
}

export function mapCanonicalNodeToCanvasNode({
  canonicalNode,
  index,
  showColumns,
  overlayDecoration,
  persistedPosition,
}: MapCanonicalNodeToCanvasNodeArgs): Node<DbtNodeData> {
  const kindRegistration = resolveNodeKindRegistration(canonicalNode.kind);

  return {
    id: canonicalNode.id,
    type: 'dbtNode',
    dragHandle: CANVAS_NODE_DRAG_HANDLE_SELECTOR,
    position: persistedPosition ?? { x: (index % 3) * 250, y: Math.floor(index / 3) * 150 },
    data: {
      name: canonicalNode.name,
      type: kindRegistration.label,
      pluginKind: canonicalNode.kind,
      role: canonicalNode.role,
      typeLabel: kindRegistration.label,
      status: canonicalNode.status,
      path: canonicalNode.path,
      description: canonicalNode.description,
      lastDuration: canonicalNode.lastDuration,
      lastCost: canonicalNode.lastCost,
      overlayDecoration: overlayDecoration ?? null,
      tags: canonicalNode.tags,
      metadata: canonicalNode.metadata == null ? undefined : { ...canonicalNode.metadata },
      columns: resolveColumns(canonicalNode.metadata?.columns),
      showColumns,
    },
  };
}

export function mapCanonicalEdgeToCanvasEdge(canonicalEdge: CanonicalEdge): Edge {
  return {
    id: canonicalEdge.id,
    source: canonicalEdge.sourceId,
    target: canonicalEdge.targetId,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6b7280', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#6b7280',
      width: 20,
      height: 20,
    },
  };
}

export function createCanvasEdgeFromConnection(connection: {
  source: string;
  target: string;
}): Edge {
  return {
    id: `${connection.source}->${connection.target}:${Date.now()}`,
    source: connection.source,
    target: connection.target,
    type: 'smoothstep',
    style: { stroke: '#6b7280', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#6b7280',
      width: 20,
      height: 20,
    },
  };
}

export function mapDroppedCanonicalNodeToCanvasNode(
  canonicalNode: CanonicalNode,
  position: { x: number; y: number },
  showColumns: boolean
): Node<DbtNodeData> {
  const kindRegistration = resolveNodeKindRegistration(canonicalNode.kind);
  const typeLabelFromMetadata =
    typeof canonicalNode.metadata?.typeLabel === 'string'
      ? canonicalNode.metadata.typeLabel
      : undefined;

  return {
    id: canonicalNode.id,
    type: 'dbtNode',
    dragHandle: CANVAS_NODE_DRAG_HANDLE_SELECTOR,
    position,
    data: {
      name: canonicalNode.name,
      type: typeLabelFromMetadata ?? kindRegistration.label,
      pluginKind: canonicalNode.kind,
      role: canonicalNode.role,
      typeLabel: kindRegistration.label,
      status: canonicalNode.status,
      path: canonicalNode.path,
      description: canonicalNode.description,
      lastDuration: canonicalNode.lastDuration,
      lastCost: canonicalNode.lastCost,
      tags: canonicalNode.tags,
      metadata: canonicalNode.metadata == null ? undefined : { ...canonicalNode.metadata },
      columns: resolveColumns(canonicalNode.metadata?.columns),
      showColumns,
    },
  };
}
