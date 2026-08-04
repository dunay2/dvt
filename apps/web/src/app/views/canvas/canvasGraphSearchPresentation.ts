/** Owned concern: project ephemeral Canvas search results into reversible graph presentation. */
import type { Edge, Node } from '@xyflow/react';

import type { CanvasGraphSearchResultSet } from './canvasGraphSearch.contract';

const ACTIVE_NODE_CLASS = 'canvas-graph-search-active-node';
const MATCHING_NODE_CLASS = 'canvas-graph-search-matching-node';
const DIMMED_NODE_CLASS = 'canvas-graph-search-dimmed-node';
const RELEVANT_EDGE_CLASS = 'canvas-graph-search-relevant-edge';
const DIMMED_EDGE_CLASS = 'canvas-graph-search-dimmed-edge';

export type CanvasGraphSearchPresentationInput = Readonly<{
  nodes: Node[];
  edges: Edge[];
  status: CanvasGraphSearchResultSet['status'];
  matchingNodeIds: readonly string[];
  activeNodeId: string | null;
}>;

export type CanvasGraphSearchPresentation = Readonly<{
  nodes: Node[];
  edges: Edge[];
}>;

export function projectCanvasGraphSearchPresentation({
  nodes,
  edges,
  status,
  matchingNodeIds,
  activeNodeId,
}: CanvasGraphSearchPresentationInput): CanvasGraphSearchPresentation {
  if (status === 'idle') {
    return { nodes, edges };
  }

  const matchingNodeIdSet = new Set(matchingNodeIds);
  return {
    nodes: nodes.map((node) => ({
      ...node,
      className: appendClassName(
        node.className,
        resolveNodeClassName(node.id, matchingNodeIdSet, activeNodeId)
      ),
    })),
    edges: edges.map((edge) => ({
      ...edge,
      className: appendClassName(
        edge.className,
        isActiveConnectivity(edge, activeNodeId) ? RELEVANT_EDGE_CLASS : DIMMED_EDGE_CLASS
      ),
    })),
  };
}

function resolveNodeClassName(
  nodeId: string,
  matchingNodeIds: ReadonlySet<string>,
  activeNodeId: string | null
): string {
  if (nodeId === activeNodeId) {
    return ACTIVE_NODE_CLASS;
  }
  return matchingNodeIds.has(nodeId) ? MATCHING_NODE_CLASS : DIMMED_NODE_CLASS;
}

function isActiveConnectivity(edge: Edge, activeNodeId: string | null): boolean {
  return activeNodeId != null && (edge.source === activeNodeId || edge.target === activeNodeId);
}

function appendClassName(className: string | undefined, stateClassName: string): string {
  return [className?.trim(), stateClassName].filter(Boolean).join(' ');
}
