/** Owned concern: project canonical dependency edges into React Flow viewport state. */
import type { Edge } from '@xyflow/react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasAuthoringVisibleEdgeId } from './canvasAuthoringGraphProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasDraftEdge } from './canvasDraftSession';
import {
  buildCanvasDependencyEdgeData,
  readCanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';
import { createCanvasDirectionalEdge } from './canvasNodeMapper';

export function projectCanvasViewportEdges(args: {
  visibleEdges: readonly CanvasDraftEdge[];
  allowedNodeIds: ReadonlySet<string>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
  canonicalEdgeBySignature: ReadonlyMap<string, CanonicalEdge>;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  locale: string;
}): Edge[] {
  const {
    visibleEdges,
    allowedNodeIds,
    canonicalEdgeIdBySignature,
    canonicalEdgeBySignature,
    canonicalNodesById,
    locale,
  } = args;
  const copy = resolveCanvasViewCopy(locale);

  return visibleEdges
    .filter((edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId))
    .map((edge) => {
      const canonicalEdge = canonicalEdgeBySignature.get(`${edge.sourceId}::${edge.targetId}`);
      const data = buildCanvasDependencyEdgeData({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        executionGate: edge.executionGate,
        canonicalMetadata: canonicalEdge?.metadata,
      });
      const baseAriaLabel = copy.canvasEdgeAccessibleLabelTemplate
        .replace('{source}', canonicalNodesById.get(edge.sourceId)?.name ?? edge.sourceId)
        .replace('{target}', canonicalNodesById.get(edge.targetId)?.name ?? edge.targetId);

      return createCanvasDirectionalEdge({
        id: resolveCanvasAuthoringVisibleEdgeId({ edge, canonicalEdgeIdBySignature }),
        source: edge.sourceId,
        target: edge.targetId,
        ariaLabel:
          data.execution.gateState === 'closed'
            ? `${baseAriaLabel}, ${copy.canvasEdgeExcludedFromExecutionLabel}`
            : baseAriaLabel,
        data,
      });
    });
}

function viewportEdgeEqual(left: Edge, right: Edge): boolean {
  return (
    left.id === right.id &&
    left.source === right.source &&
    left.target === right.target &&
    left.ariaLabel === right.ariaLabel &&
    JSON.stringify(readCanvasDependencyEdgeData(left.data)) ===
      JSON.stringify(readCanvasDependencyEdgeData(right.data))
  );
}

export function canvasViewportEdgesEqual(left: Edge[], right: Edge[]): boolean {
  return (
    left.length === right.length &&
    left.every((edge, index) => viewportEdgeEqual(edge, right[index]!))
  );
}
