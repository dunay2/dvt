/** Owned concern: derive execution-safe canonical snapshots from semantic authoring projections. */
import type { CanvasDraftEdge } from './canvasDraftSession';

export type CanvasCanonicalSnapshot = {
  canonicalNodeIds: string[];
  canonicalEdges: CanvasDraftEdge[];
};

export function buildCanvasCanonicalSnapshot(
  canonicalNodes: Array<{ id: string }>,
  canonicalEdges: Array<{ sourceId: string; targetId: string }>
): CanvasCanonicalSnapshot {
  return {
    canonicalNodeIds: canonicalNodes.map((node) => node.id),
    canonicalEdges: canonicalEdges.map((edge) => ({
      sourceId: edge.sourceId,
      targetId: edge.targetId,
    })),
  };
}

export const deriveCanvasCanonicalSnapshot = buildCanvasCanonicalSnapshot;
