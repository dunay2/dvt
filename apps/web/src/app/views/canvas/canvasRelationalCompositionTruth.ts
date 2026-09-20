/** Owned concern: derive relational-composition state from graph topology and canonical semantics. */
import {
  DvtSubstraitSemanticDocumentV1Schema,
  decodeDvtSubstraitPlanV1,
  type ConnectedSourceRef,
} from '@dvt/contracts';

import type {
  CanvasRelationalCompositionOperation,
  CanvasRelationalCompositionTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import { inspectDvtSubstraitUnionAllAcceptedDraft } from './canvasDvtSubstraitSetComposition';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';
import { inspectDvtSubstraitAcceptedCrossDraft } from '@dvt/postgres-projection';
import { peelCanvasDvtSubstraitSortFetch } from './canvasDvtSubstraitSortFetch';

function uniqueSourceRefs(
  sourceRefs: readonly ConnectedSourceRef[]
): readonly ConnectedSourceRef[] {
  return sourceRefs.filter(
    (sourceRef, index) =>
      sourceRefs.findIndex((candidate) => hasSameConnectedSourceRef(candidate, sourceRef)) === index
  );
}

function resolveCanonicalOperation(
  semanticDocument: unknown
): CanvasRelationalCompositionOperation | null {
  try {
    const document = DvtSubstraitSemanticDocumentV1Schema.parse(semanticDocument);
    const wrapped = {
      plan: decodeDvtSubstraitPlanV1(document),
      sidecar: document.sidecar,
    };
    const draft = peelCanvasDvtSubstraitSortFetch(wrapped).base;
    const join = inspectDvtSubstraitJoinAcceptedDraft(draft);
    if (join.ok) {
      const structure = inspectDvtSubstraitJoinDraft(draft);
      const joinType = structure.ok
        ? structure.projection.joinRelations.at(-1)?.joinType
        : undefined;
      return joinType == null ? 'inner_join' : canvasJoinOperationForType(joinType);
    }
    if (inspectDvtSubstraitAcceptedCrossDraft(draft).ok) return 'cross_join';
    const unionAll = inspectDvtSubstraitUnionAllAcceptedDraft(draft);
    if (unionAll.ok) return unionAll.projection.operation;
  } catch {
    // Invalid or unsupported semantic documents remain unresolved.
  }

  return null;
}

export function resolveCanvasRelationalCompositionTruth(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): CanvasRelationalCompositionTruth | null {
  if (
    args.node.pluginId !== 'dvt' ||
    args.node.kind !== 'dvt:transform' ||
    args.node.role !== 'transform'
  ) {
    return null;
  }

  const connectedNodeIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.node.id).map((edge) => edge.sourceId)
  );
  const connectedInputs = resolveCanvasDvtCompositionInputs({
    targetNodeId: args.node.id,
    nodes: args.nodes,
    edges: args.edges,
  });
  const connectedInputCount = connectedNodeIds.size;
  if (connectedInputs.length !== connectedInputCount) {
    return { state: 'unresolved', connectedInputCount, reason: 'input-identity-unavailable' };
  }

  let authority: ReturnType<typeof readDvtTransformAuthoringAuthority>;
  try {
    authority = readDvtTransformAuthoringAuthority(args.node);
  } catch {
    return { state: 'unresolved', connectedInputCount, reason: 'semantic-authority-invalid' };
  }

  if (authority == null) {
    return connectedInputCount > 1
      ? {
          state: 'pending',
          connectedInputCount,
          pendingInputCount: connectedInputCount,
        }
      : { state: 'single-input', connectedInputCount };
  }

  const canonicalSourceRefs = uniqueSourceRefs(
    authority.semanticDocument.sidecar.relations.flatMap((relation) =>
      relation.sourceRef == null ? [] : [relation.sourceRef]
    )
  );
  const connectedSourceRefs = connectedInputs.map((input) => input.sourceRef);
  const missingInputCount = canonicalSourceRefs.filter(
    (sourceRef) =>
      !connectedSourceRefs.some((connected) => hasSameConnectedSourceRef(connected, sourceRef))
  ).length;
  const pendingInputCount = connectedSourceRefs.filter(
    (sourceRef) =>
      !canonicalSourceRefs.some((canonical) => hasSameConnectedSourceRef(canonical, sourceRef))
  ).length;
  const canonicalOperation = resolveCanonicalOperation(authority.semanticDocument);

  if (missingInputCount > 0) {
    return {
      state: 'incomplete',
      connectedInputCount,
      missingInputCount,
      ...(canonicalOperation == null ? {} : { canonicalOperation }),
    };
  }
  if (pendingInputCount > 0) {
    return {
      state: 'pending',
      connectedInputCount,
      pendingInputCount,
      ...(canonicalOperation == null ? {} : { canonicalOperation }),
    };
  }
  if (canonicalOperation != null) {
    return { state: 'canonical', connectedInputCount, operation: canonicalOperation };
  }
  return connectedInputCount > 1
    ? { state: 'unresolved', connectedInputCount, reason: 'semantic-authority-invalid' }
    : { state: 'single-input', connectedInputCount };
}
