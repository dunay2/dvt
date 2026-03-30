import type { Edge } from '@xyflow/react';

import type {
  MergedNodeDecoration,
  NodeDecoration,
  OverlayContext,
} from '../../plugins/contracts/NodeRendering';
import type { CanvasOverlayContribution } from '../../plugins/contracts/NodeRendering';
import { mergeDecorations } from '../../plugins/mergeDecorations';
import type { NodeCostData } from '../../plugins/contracts/PluginServices';
import type { CanonicalNode } from '../../types/canonical';
import type { RunStatusSnapshot } from '../../types/engine';

// ---------------------------------------------------------------------------
// buildImpactSets — BFS upstream/downstream from all selected nodes
// ---------------------------------------------------------------------------

function buildImpactSets(
  edges: Edge[],
  selectedIds: string[]
): { upstreamOfSelected: Set<string>; downstreamOfSelected: Set<string> } {
  const upstreamOfSelected = new Set<string>();
  const downstreamOfSelected = new Set<string>();

  for (const selectedId of selectedIds) {
    // upstream: nodes that feed into the selected node
    const upQ = [selectedId];
    const visitedUp = new Set<string>();
    while (upQ.length > 0) {
      const cur = upQ.shift()!;
      if (visitedUp.has(cur)) continue;
      visitedUp.add(cur);
      for (const edge of edges) {
        if (edge.target === cur && edge.source !== selectedId) {
          upstreamOfSelected.add(edge.source);
          upQ.push(edge.source);
        }
      }
    }

    // downstream: nodes that the selected node feeds into
    const dnQ = [selectedId];
    const visitedDn = new Set<string>();
    while (dnQ.length > 0) {
      const cur = dnQ.shift()!;
      if (visitedDn.has(cur)) continue;
      visitedDn.add(cur);
      for (const edge of edges) {
        if (edge.source === cur && edge.target !== selectedId) {
          downstreamOfSelected.add(edge.target);
          dnQ.push(edge.target);
        }
      }
    }
  }

  return { upstreamOfSelected, downstreamOfSelected };
}

// ---------------------------------------------------------------------------
// buildOverlayContext — pure, called once per render cycle
// ---------------------------------------------------------------------------

export function buildOverlayContext(
  edges: Edge[],
  selectedNodeIds: string[],
  activeRun: RunStatusSnapshot | null,
  runStatusByNodeId: ReadonlyMap<string, string>,
  costByNodeId: ReadonlyMap<string, NodeCostData>
): OverlayContext {
  const { upstreamOfSelected, downstreamOfSelected } = buildImpactSets(edges, selectedNodeIds);

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
    const exclusive: NodeDecoration | null = exclusiveOverlay?.nodeDecorator(node, ctx) ?? null;
    const additives: NodeDecoration[] = additiveOverlays
      .map((o) => o.nodeDecorator(node, ctx))
      .filter((d): d is NodeDecoration => d !== null);

    result.set(node.id, mergeDecorations(exclusive, additives));
  }

  return result;
}
