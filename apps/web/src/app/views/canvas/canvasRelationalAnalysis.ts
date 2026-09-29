/** One structural read shared by tree, composition status and input catalogue. */
import {
  indexSubstraitRelations,
  type SubstraitDocument,
  type SubstraitRelationIndex,
  deriveSubstraitPublication,
  type RelationPublication,
} from '@dvt/substrait-analysis';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInputBindingEdge } from './canvasInputBindings';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { resolveUnmappedCanvasReadFields } from './canvasInputFieldEligibility';
import type {
  CanvasRelationalTreeInput,
  CanvasRelationalTreeProjectionResult,
} from './canvasRelationalTreeProjection';

export type CanvasRelationalAnalysisArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
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
    publication?: ReadonlyMap<string, RelationPublication>;
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
  producers: ReadonlyMap<string, CanonicalNode>
): readonly CanvasRelationalTreeInput[] {
  const connected = new Map<string, CanvasDvtCompositionInput>();
  for (const input of inputs) {
    if (input.sourceRef == null) continue;
    const key = canvasSourceReferenceKey(input.sourceRef);
    if (!connected.has(key)) connected.set(key, input);
  }
  const participating = new Set<string>();
  const canonical = [...index.relations.values()]
    .map((entry) => entry.binding)
    .filter((binding) => binding.sourceRef != null || binding.producerRef != null)
    .sort((a, b) => a.relAnchor - b.relAnchor)
    .map((binding) => {
      if (binding.producerRef != null) {
        const sourceNodeId = binding.producerRef.nodeId;
        participating.add(sourceNodeId);
        return {
          sourceRef: null,
          sourceNodeId,
          relationId: binding.relationId,
          state: producers.has(sourceNodeId) ? ('participating' as const) : ('missing' as const),
        };
      }
      const sourceRef = binding.sourceRef!;
      const key = canvasSourceReferenceKey(sourceRef);
      participating.add(key);
      const input = connected.get(key);
      return {
        sourceRef,
        sourceNodeId: input?.nodeId ?? null,
        relationId: binding.relationId,
        state: input == null ? ('missing' as const) : ('participating' as const),
      };
    });
  const pending = inputs
    .filter(
      (input) =>
        input.sourceRef != null && !participating.has(canvasSourceReferenceKey(input.sourceRef))
    )
    .sort((a, b) =>
      canvasSourceReferenceKey(a.sourceRef!).localeCompare(canvasSourceReferenceKey(b.sourceRef!))
    )
    .map((input) => ({
      sourceRef: input.sourceRef,
      sourceNodeId: input.nodeId,
      relationId: null,
      state: 'pending' as const,
    }));
  return [
    ...canonical,
    ...pending,
    ...[...producers.keys()]
      .filter((id) => !participating.has(id))
      .map((sourceNodeId) => ({
        sourceRef: null,
        sourceNodeId,
        relationId: null,
        state: 'pending' as const,
      })),
  ];
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
    const producers = new Map<string, CanonicalNode>();
    for (const node of args.nodes) {
      if (!incomingIds.has(node.id) || node.pluginId !== 'dvt' || node.kind !== 'dvt:transform')
        continue;
      producers.set(node.id, node);
    }
    if (inputs.length !== connectedInputCount)
      return { ...base, failure: 'input-identity-unavailable' };
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) return { ...base, failure: 'missing-semantic-authority' };
    const document = resolveCanvasProducerDocument(args.node, args.nodes)!;
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) return { ...base, failure: 'invalid-semantic-authority' };
    const denied = resolveUnmappedCanvasReadFields({ ...args, nodeId: args.node.id, document });
    return {
      ...base,
      failure: null,
      connectedModelRelationIds: [...indexed.index.relations.values()]
        .filter((entry) => entry.binding.producerRef != null)
        .map((entry) => entry.binding.relationId),
      semantic: {
        index: indexed.index,
        digest: authority.semanticDocument.semanticPlan.sha256,
        document,
        ...(denied.size === 0 ? {} : { publication: deriveSubstraitPublication(document, denied) }),
      },
      projectedInputs: projectInputs(indexed.index, inputs, producers),
    };
  } catch {
    return { ...base, failure: 'invalid-semantic-authority' };
  }
}
