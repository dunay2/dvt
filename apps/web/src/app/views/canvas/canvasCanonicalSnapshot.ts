/** Owned concern: derive execution-safe canonical snapshots from semantic authoring projections. */
import type { CanvasDraftEdge } from './canvasDraftSession';

export type CanvasCanonicalSnapshot = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export function buildCanvasCanonicalSnapshot(
  canonicalNodes: Array<{ id: string }>,
  canonicalEdges: readonly CanvasDraftEdge[]
): CanvasCanonicalSnapshot {
  return {
    canonicalNodeIds: canonicalNodes.map((node) => node.id),
    canonicalEdges: canonicalEdges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
      ...(edge.inputBindings == null ? {} : { inputBindings: edge.inputBindings }),
    })),
  };
}

export const deriveCanvasCanonicalSnapshot = buildCanvasCanonicalSnapshot;
