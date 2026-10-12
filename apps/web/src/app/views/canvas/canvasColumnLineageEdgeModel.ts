/** Project reference-backed lineage into the graph renderer's edge DTO. */
import type { Edge } from '@xyflow/react';
import { createCanvasColumnHandleId } from './canvasColumnHandleIdentity';
/** Semantic identity is reference-backed; names are presentation only. */
export type CanvasColumnLineageEdgeData = Readonly<{
  kind: 'column-lineage' | 'column-lineage-terminal';
  sourceNodeId: string;
  sourceFieldId: string;
  sourceColumnName: string;
  targetNodeId: string;
  outputId: string;
  targetColumnName: string;
  removable: boolean;
}> &
  Record<string, unknown>;

export type CanvasColumnLineageEdge = Edge<CanvasColumnLineageEdgeData>;

function createLineageEdgeId(parts: readonly string[]): string {
  return `column-lineage:${parts.map((part) => encodeURIComponent(part)).join(':')}`;
}

export function buildCanvasColumnLineageEdge(args: {
  sourceNodeId: string;
  sourceFieldId: string;
  sourceColumnName: string;
  sourceHandleColumnId: string;
  targetNodeId: string;
  outputId: string;
  targetColumnName: string;
  targetHandleColumnId: string;
  terminal: boolean;
  removable: boolean;
}): CanvasColumnLineageEdge {
  return {
    id: createLineageEdgeId([
      args.sourceNodeId,
      args.sourceFieldId,
      args.targetNodeId,
      args.outputId,
    ]),
    source: args.sourceNodeId,
    target: args.targetNodeId,
    sourceHandle: createCanvasColumnHandleId({
      direction: 'source',
      nodeId: args.sourceNodeId,
      columnId: args.sourceHandleColumnId,
    }),
    targetHandle: createCanvasColumnHandleId({
      direction: 'target',
      nodeId: args.targetNodeId,
      columnId: args.targetHandleColumnId,
    }),
    type: 'columnLineage',
    animated: false,
    selectable: true,
    focusable: true,
    deletable: false,
    reconnectable: false,
    data: {
      kind: args.terminal ? 'column-lineage-terminal' : 'column-lineage',
      sourceNodeId: args.sourceNodeId,
      sourceFieldId: args.sourceFieldId,
      sourceColumnName: args.sourceColumnName,
      targetNodeId: args.targetNodeId,
      outputId: args.outputId,
      targetColumnName: args.targetColumnName,
      removable: args.removable && !args.terminal,
    },
  };
}
