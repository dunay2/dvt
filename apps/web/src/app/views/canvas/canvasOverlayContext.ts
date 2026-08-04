import type { Edge } from '@xyflow/react';

import type {
  MergedNodeDecoration,
  NodeDecoration,
  OverlayContext,
} from '../../plugins/contracts/NodeRendering';
import type { CanvasOverlayContribution } from '../../plugins/contracts/NodeRendering';
import { mergeDecorations } from '../../plugins/mergeDecorations';
import type { NodeCostData } from '../../plugins/contracts/NodeCostData';
import type { CanonicalNode } from '../../types/canonical';
import type { CanonicalRunStatus } from '../../types/engine';

type Adjacency = ReadonlyMap<string, readonly string[]>;

function appendAdjacentNode(
  adjacency: Map<string, string[]>,
  nodeId: string,
  adjacentId: string
): void {
  const adjacentNodes = adjacency.get(nodeId);
  if (adjacentNodes) {
    adjacentNodes.push(adjacentId);
    return;
  }

  adjacency.set(nodeId, [adjacentId]);
}

function collectReachableNodes(rootId: string, adjacency: Adjacency, result: Set<string>): void {
  const queue = [rootId];
  const visited = new Set<string>();

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined || visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const adjacentId of adjacency.get(current) ?? []) {
      if (adjacentId === rootId) {
        continue;
      }
      result.add(adjacentId);
      queue.push(adjacentId);
    }
  }
}

function buildImpactSets(
  edges: Edge[],
  selectedIds: string[]
): { upstreamOfSelected: Set<string>; downstreamOfSelected: Set<string> } {
  const upstreamOfSelected = new Set<string>();
  const downstreamOfSelected = new Set<string>();
  const forwardAdjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  for (const edge of edges) {
    appendAdjacentNode(forwardAdjacency, edge.source, edge.target);
    appendAdjacentNode(reverseAdjacency, edge.target, edge.source);
  }

  for (const selectedId of selectedIds) {
    collectReachableNodes(selectedId, reverseAdjacency, upstreamOfSelected);
    collectReachableNodes(selectedId, forwardAdjacency, downstreamOfSelected);
  }

  return { upstreamOfSelected, downstreamOfSelected };
}

// ---------------------------------------------------------------------------
// buildOverlayContext — pure, called once per render cycle
// ---------------------------------------------------------------------------

export function buildOverlayContext(
  edges: Edge[],
  selectedNodeIds: string[],
  activeRun: CanonicalRunStatus | null,
  runStatusByNodeId: ReadonlyMap<string, string>,
  costByNodeId: ReadonlyMap<string, NodeCostData>,
  impactOverlayEnabled = true
): OverlayContext {
  const { upstreamOfSelected, downstreamOfSelected } = impactOverlayEnabled
    ? buildImpactSets(edges, selectedNodeIds)
    : { upstreamOfSelected: new Set<string>(), downstreamOfSelected: new Set<string>() };

  return {
    activeRun,
    runStatusByNodeId,
    costByNodeId,
    selectedNodeIds: new Set(selectedNodeIds),
    upstreamOfSelected,
    downstreamOfSelected,
  };
}

// ---------------------------------------------------------------------------
// buildNodeDecorations — applies all active overlays, returns per-node result
// ---------------------------------------------------------------------------

function resolveNodeDecoration(
  overlay: CanvasOverlayContribution | null,
  node: CanonicalNode,
  ctx: OverlayContext
): NodeDecoration | null {
  if (!overlay) {
    return null;
  }

  try {
    return overlay.nodeDecorator(node, ctx);
  } catch {
    return null;
  }
}

export function buildNodeDecorations(
  canonicalNodes: CanonicalNode[],
  overlays: CanvasOverlayContribution[],
  activeExclusiveOverlayId: string | null,
  ctx: OverlayContext
): Map<string, MergedNodeDecoration | null> {
  const result = new Map<string, MergedNodeDecoration | null>();

  if (overlays.length === 0) return result;

  const exclusiveOverlay =
    activeExclusiveOverlayId !== null
      ? (overlays.find((o) => o.mode === 'exclusive' && o.id === activeExclusiveOverlayId) ?? null)
      : null;

  const additiveOverlays = overlays.filter((o) => o.mode === 'additive');

  for (const node of canonicalNodes) {
    const exclusive = resolveNodeDecoration(exclusiveOverlay, node, ctx);
    const additives: NodeDecoration[] = additiveOverlays
      .map((overlay) => resolveNodeDecoration(overlay, node, ctx))
      .filter((d): d is NodeDecoration => d !== null);

    result.set(node.id, mergeDecorations(exclusive, additives));
  }

  return result;
}
