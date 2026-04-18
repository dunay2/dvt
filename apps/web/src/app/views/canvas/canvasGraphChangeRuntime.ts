import type { CanvasDraftEdge } from './canvasDraftSession';

export function mapCanvasEdgesToDraftEdges(
  edges: Array<{ source: string; target: string }>
): CanvasDraftEdge[] {
  return edges.map((edge) => ({
    sourceId: edge.source,
    targetId: edge.target,
  }));
}
