/** One structural read shared by tree, composition status and input catalogue. */
import { indexSubstraitRelations, type SubstraitRelationIndex } from '@dvt/substrait-analysis';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
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
  inputs: readonly CanvasDvtCompositionInput[];
  projectedInputs: readonly CanvasRelationalTreeInput[];
  semantic: Readonly<{ index: SubstraitRelationIndex; digest: string }> | null;
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
  inputs: readonly CanvasDvtCompositionInput[]
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
      return {
        sourceRef,
        sourceNodeId: input?.nodeId ?? null,
        relationId: binding.relationId,
        state: input == null ? ('missing' as const) : ('participating' as const),
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
    projectedInputs: [],
    semantic: null,
  };
  if (!isTransform) return { ...base, failure: 'invalid-semantic-authority' };
  if (inputs.length !== connectedInputCount)
    return { ...base, failure: 'input-identity-unavailable' };
  try {
    const authority = readDvtTransformAuthoringAuthority(args.node);
    if (authority == null) return { ...base, failure: 'missing-semantic-authority' };
    const indexed = indexSubstraitRelations(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
    );
    if (!indexed.ok) return { ...base, failure: 'invalid-semantic-authority' };
    return {
      ...base,
      failure: null,
      semantic: { index: indexed.index, digest: authority.semanticDocument.semanticPlan.sha256 },
      projectedInputs: projectInputs(indexed.index, inputs),
    };
  } catch {
    return { ...base, failure: 'invalid-semantic-authority' };
  }
}
