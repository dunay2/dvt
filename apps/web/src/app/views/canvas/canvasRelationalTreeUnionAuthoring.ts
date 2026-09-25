/** Owned concern: order selected Canvas inputs for initial SET capability discovery. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveConnectedSetEntry } from './canvasConnectedRelationInputs';

export type CanvasRelationalTreeUnionContext = Readonly<{
  selectedInputIds: readonly string[];
  targetNodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

export function orderedCanvasRelationalTreeUnionAllEntry(args: CanvasRelationalTreeUnionContext) {
  const selectedIds = new Set(args.selectedInputIds);
  const targetNode = args.nodes.find((node) => node.id === args.targetNodeId);
  if (targetNode == null) return null;
  const entry = resolveConnectedSetEntry({
    targetNode,
    nodes: args.nodes,
    edges: args.edges.filter(
      (edge) => edge.targetId === args.targetNodeId && selectedIds.has(edge.sourceId)
    ),
  });
  if (entry == null) return null;
  const byNodeId = new Map(entry.inputs.map((input) => [input.nodeId, input] as const));
  const ordered = args.selectedInputIds.map((nodeId) => byNodeId.get(nodeId));
  return ordered.some((input) => input == null)
    ? null
    : { ...entry, inputs: ordered.filter((input) => input != null) };
}
