/** One structural read shared by tree, composition status and input catalogue. */
import {
  indexSubstraitRelations,
  type SubstraitDocument,
  type SubstraitRelationIndex,
} from '@dvt/substrait-analysis';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  matchesCanvasSubstraitUpstream,
  type IndexedCanvasDocument,
} from './canvasSubstraitUpstreamBinding';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeProjectionResult,
} from './canvasRelationalTreeProjection';

export type CanvasRelationalAnalysisArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
}>;
type Failure = Extract<CanvasRelationalTreeProjectionResult, { ok: false }>['failure']['code'];
export type CanvasRelationalAnalysis = Readonly<{
  transformNodeId: string;
  isTransform: boolean;
  connectedInputCount: number;
  connectedModelRelationIds: readonly string[];
  inputs: readonly CanvasDvtCompositionInput[];
  projectedInputs: readonly CanvasRelationalTreeInput[];
  semantic: Readonly<{
    index: SubstraitRelationIndex;
    digest: string;
    document: SubstraitDocument;
  }> | null;
  failure: Failure | null;
}>;

export function canvasSourceReferenceKey(ref: ConnectedSourceRef): string {
  return JSON.stringify([
    ref.connectionRef.provider,
    ref.connectionRef.connectionId,
    ref.sourceObjectId,
  ]);
}

function projectInputs(
  index: SubstraitRelationIndex,
  inputs: readonly CanvasDvtCompositionInput[],
  producers: ReadonlyMap<string, string>
): readonly CanvasRelationalTreeInput[] {
  const connected = new Map<string, CanvasDvtCompositionInput>();
  for (const input of inputs) {
    const key = canvasSourceReferenceKey(input.sourceRef);
    if (!connected.has(key)) connected.set(key, input);
  }
  const participating = new Set<string>();
  const canonical = [...index.relations.values()]
    .map((entry) => entry.binding)
    .filter((binding) => binding.sourceRef != null)
    .sort((a, b) => a.relAnchor - b.relAnchor)
    .map((binding) => {
      const sourceRef = binding.sourceRef!;
      const key = canvasSourceReferenceKey(sourceRef);
      participating.add(key);
      const input = connected.get(key);
      const producerId = producers.get(binding.relationId);
      return {
        sourceRef,
        sourceNodeId: producerId ?? input?.nodeId ?? null,
        relationId: binding.relationId,
        state:
          input == null && producerId == null ? ('missing' as const) : ('participating' as const),
      };
    });
  const pending = inputs
    .filter((input) => !participating.has(canvasSourceReferenceKey(input.sourceRef)))
    .sort((a, b) =>
      canvasSourceReferenceKey(a.sourceRef).localeCompare(canvasSourceReferenceKey(b.sourceRef))
    )
    .map((input) => ({
      sourceRef: input.sourceRef,
      sourceNodeId: input.nodeId,
      relationId: null,
      state: 'pending' as const,
    }));
  return [...canonical, ...pending];
}

export function analyzeCanvasRelations(
  args: CanvasRelationalAnalysisArgs
): CanvasRelationalAnalysis {
  const isTransform =
    args.node.pluginId === 'dvt' &&
    args.node.kind === 'dvt:transform' &&
    args.node.role === 'transform';
  const inputs = resolveCanvasDvtCompositionInputs({
    targetNodeId: args.node.id,
    nodes: args.nodes,
    edges: args.edges,
  });
  const connectedInputCount = new Set(
    args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
  ).size;
  const base = {
    transformNodeId: args.node.id,
    isTransform,
    inputs,
    connectedInputCount,
    connectedModelRelationIds: [],
    projectedInputs: [],
    semantic: null,
  };
  if (!isTransform) return { ...base, failure: 'invalid-semantic-authority' };
  try {
    const incomingIds = new Set(
      args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
    );
    const producers = new Map<string, IndexedCanvasDocument>();
    for (const node of args.nodes) {
      if (!incomingIds.has(node.id) || node.pluginId !== 'dvt' || node.kind !== 'dvt:transform')
        continue;
      const producerAuthority = readDvtTransformAuthoringAuthority(node);
      if (producerAuthority == null) continue;
      const document = decodeDvtSubstraitSemanticDocument(producerAuthority.semanticDocument);
      const indexed = indexSubstraitRelations(document);
      if (indexed.ok) producers.set(node.id, { document, index: indexed.index });
    }
    if (inputs.length + producers.size !== connectedInputCount)
      return { ...base, failure: 'input-identity-unavailable' };
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) return { ...base, failure: 'missing-semantic-authority' };
    const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) return { ...base, failure: 'invalid-semantic-authority' };
    const covered = new Map<string, string>();
    for (const [id, producer] of producers) {
      if (!matchesCanvasSubstraitUpstream({ document, index: indexed.index }, producer))
        return { ...base, failure: 'input-identity-unavailable' };
      for (const relationId of producer.index.relations.keys()) covered.set(relationId, id);
    }
    return {
      ...base,
      failure: null,
      connectedModelRelationIds: [...producers.values()].map((producer) => producer.index.rootId),
      semantic: {
        index: indexed.index,
        digest: authority.semanticDocument.semanticPlan.sha256,
        document,
      },
      projectedInputs: projectInputs(indexed.index, inputs, covered),
    };
  } catch {
    return { ...base, failure: 'invalid-semantic-authority' };
  }
}
