/** Owned concern: project FilterCanvasGraph results into reversible React Flow presentation. */
import type { Edge, Node } from '@xyflow/react';

import type { CanvasGraphFilterResult } from './canvasGraphFilter.contract';

const DIMMED_NODE_CLASS = 'canvas-graph-filter-dimmed-node';
const DIMMED_EDGE_CLASS = 'canvas-graph-filter-dimmed-edge';

export type CanvasGraphFilterPresentation = Readonly<{
  nodes: Node[];
  edges: Edge[];
}>;

export function projectCanvasGraphFilterPresentation({
  nodes,
  edges,
  result,
}: Readonly<{
  nodes: Node[];
  edges: Edge[];
  result: CanvasGraphFilterResult;
}>): CanvasGraphFilterPresentation {
  if (result.status === 'idle') {
    return { nodes, edges };
  }

  const matchingNodeIds = new Set(result.matchingNodeIds);
  if (result.query.presentation === 'hide') {
    return {
      nodes: nodes.filter((node) => matchingNodeIds.has(node.id)),
      edges: edges.filter(
        (edge) => matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)
      ),
    };
  }

  return {
    nodes: nodes.map((node) =>
      matchingNodeIds.has(node.id)
        ? node
        : { ...node, className: appendClassName(node.className, DIMMED_NODE_CLASS) }
    ),
    edges: edges.map((edge) =>
      matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)
        ? edge
        : { ...edge, className: appendClassName(edge.className, DIMMED_EDGE_CLASS) }
    ),
  };
}

function appendClassName(className: string | undefined, stateClassName: string): string {
  return [className?.trim(), stateClassName].filter(Boolean).join(' ');
}
