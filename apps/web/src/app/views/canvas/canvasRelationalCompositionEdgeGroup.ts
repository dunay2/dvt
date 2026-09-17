/** Owned concern: correlate real dependency edges for relational-composition presentation. */
import type {
  CanvasRelationalCompositionOperation,
  CanvasRelationalCompositionTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftEdge } from './canvasDraftSession';
import { resolveCanvasRelationalCompositionTruth } from './canvasRelationalCompositionTruth';

export type CanvasRelationalCompositionEdgeMember = Readonly<{
  groupId: string;
  memberCount: number;
  role: 'branch' | 'trunk-owner';
  state: Exclude<CanvasRelationalCompositionTruth['state'], 'single-input'>;
  operation?: CanvasRelationalCompositionOperation;
}>;

function edgeSignature(edge: Pick<CanvasDraftEdge, 'sourceId' | 'targetId'>): string {
  return `${edge.sourceId}::${edge.targetId}`;
}

export function projectCanvasRelationalCompositionEdgeGroup(
  args: Readonly<{
    targetId: string;
    incomingEdges: readonly Pick<CanvasDraftEdge, 'sourceId' | 'targetId'>[];
    truth: CanvasRelationalCompositionTruth;
  }>
): ReadonlyMap<string, CanvasRelationalCompositionEdgeMember> {
  if (args.incomingEdges.length < 2 || args.truth.state === 'single-input') return new Map();

  const orderedSignatures = args.incomingEdges.map(edgeSignature).sort();
  const trunkOwnerSignature = orderedSignatures[0];
  const state: CanvasRelationalCompositionEdgeMember['state'] = args.truth.state;
  const operation =
    args.truth.state === 'canonical'
      ? args.truth.operation
      : args.truth.state === 'pending' || args.truth.state === 'incomplete'
        ? args.truth.canonicalOperation
        : undefined;

  return new Map(
    orderedSignatures.map((signature) => [
      signature,
      {
        groupId: `relational-composition:${args.targetId}`,
        memberCount: orderedSignatures.length,
        role: signature === trunkOwnerSignature ? 'trunk-owner' : 'branch',
        state,
        ...(operation == null ? {} : { operation }),
      },
    ])
  );
}

export function resolveCanvasRelationalCompositionEdgeMembers(
  args: Readonly<{
    nodes: readonly CanonicalNode[];
    edges: readonly CanvasDraftEdge[];
  }>
): ReadonlyMap<string, CanvasRelationalCompositionEdgeMember> {
  const nodesById = new Map(args.nodes.map((node) => [node.id, node]));
  const incomingEdgesByTarget = new Map<string, CanvasDraftEdge[]>();
  for (const edge of args.edges) {
    const incomingEdges = incomingEdgesByTarget.get(edge.targetId) ?? [];
    incomingEdges.push(edge);
    incomingEdgesByTarget.set(edge.targetId, incomingEdges);
  }

  const members = new Map<string, CanvasRelationalCompositionEdgeMember>();
  for (const [targetId, incomingEdges] of incomingEdgesByTarget) {
    if (incomingEdges.length < 2) continue;
    const target = nodesById.get(targetId);
    if (target == null) continue;
    const truth = resolveCanvasRelationalCompositionTruth({
      node: target,
      nodes: args.nodes,
      edges: args.edges,
    });
    if (truth == null) continue;
    for (const [signature, member] of projectCanvasRelationalCompositionEdgeGroup({
      targetId,
      incomingEdges,
      truth,
    })) {
      members.set(signature, member);
    }
  }
  return members;
}
