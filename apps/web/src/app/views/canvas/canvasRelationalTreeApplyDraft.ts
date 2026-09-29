/** Project the exact node draft submitted by the relational authoring transaction. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  type DvtRelationalAuthoringDraftV1,
} from '@dvt/contracts';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  createCanvasInspectorNodeDraft,
  canonicalizeCanvasInspectorNodeDraft,
  areCanvasInspectorNodeDraftsEqual,
} from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasStagedOperationKind } from './canvasStagedOperation';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import {
  createCanvasRelationalAuthoringDraft,
  retainIncompleteCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';

/** Decide what Apply means before a React coordinator dispatches the existing command. */
export function prepareCanvasRelationalTreeApply(
  args: Readonly<{
    transformNode: CanonicalNode;
    active: boolean;
    joinDraft: SubstraitDocument | null;
    operation: CanvasRelationalOperation | null;
    hasSelectedInputs: boolean;
    pending: Parameters<typeof createCanvasRelationalAuthoringDraft>[0];
    baselineOutputId: string | null;
    semanticRootId: string | null;
  }>
) {
  const { pending } = args;
  const cleared =
    args.active &&
    args.joinDraft == null &&
    args.operation == null &&
    !args.hasSelectedInputs &&
    pending.sources.length === 0 &&
    pending.operations.length === 0;
  const outputChanged = pending.outputRelationId !== args.baselineOutputId;
  const selectsSemanticRoot =
    pending.outputRelationId != null && pending.outputRelationId === args.semanticRootId;
  const hasIncompleteGraph =
    pending.sources.length > 0 ||
    pending.operations.length > 0 ||
    (outputChanged && !selectsSemanticRoot);
  const request = {
    transformNode: args.transformNode,
    cleared,
    operation: args.operation,
    joinDraft: args.joinDraft,
    relationalAuthoringDraft: cleared
      ? null
      : hasIncompleteGraph
        ? createCanvasRelationalAuthoringDraft(pending)
        : undefined,
  };
  const draft = createCanvasRelationalTreeApplyDraft(request);
  return {
    request,
    cleared,
    hasIncompleteGraph,
    hasDraftChanges: !areCanvasInspectorNodeDraftsEqual(
      createCanvasInspectorNodeDraft(args.transformNode),
      canonicalizeCanvasInspectorNodeDraft(args.transformNode, draft)
    ),
  };
}

function appliedOperation(
  operation: CanvasStagedOperationKind,
  fallback: CanvasRelationalOperation | null
): CanvasRelationalOperation | null {
  if (operation === 'field_transform') return 'projection';
  if (isCanvasJoinOperation(operation) || isCanvasSetOperation(operation)) return operation;
  if (operation === 'cross_join' || operation === 'projection') return operation;
  return fallback ?? 'projection';
}

function resolveAppliedSemantic(args: {
  relationalAuthoringDraft?: DvtRelationalAuthoringDraftV1 | null;
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
}): Readonly<{
  document: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
}> {
  const output = args.relationalAuthoringDraft?.operations.find(
    (candidate) =>
      candidate.relationId === args.relationalAuthoringDraft?.outputRelationId &&
      candidate.semanticDocument != null
  );
  const operation = output == null ? null : appliedOperation(output.operation, args.operation);
  if (output?.semanticDocument == null || operation == null)
    return { document: args.joinDraft, operation: args.operation };
  return {
    document: decodeDvtSubstraitSemanticDocument(output.semanticDocument),
    operation,
  };
}

function removeAppliedRelations(
  draft: DvtRelationalAuthoringDraftV1,
  document: SubstraitDocument | null
): DvtRelationalAuthoringDraftV1 | null {
  if (document == null) return draft;
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) return draft;
  const appliedIds = new Set(indexed.index.relations.keys());
  return retainIncompleteCanvasRelationalAuthoringDraft(
    DvtRelationalAuthoringDraftV1Schema.parse({
      ...draft,
      sources: draft.sources.filter((source) => !appliedIds.has(source.relationId)),
      operations: draft.operations.filter((operation) => !appliedIds.has(operation.relationId)),
    })
  );
}

export function createCanvasRelationalTreeApplyDraft(args: {
  transformNode: CanonicalNode;
  relationalAuthoringDraft?: DvtRelationalAuthoringDraftV1 | null;
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
}): CanvasInspectorNodeDraft {
  const applied = resolveAppliedSemantic(args);
  const semanticDraft =
    args.relationalAuthoringDraft === null
      ? createCanvasRelationalTreeNodeDraft(args.transformNode, null, null)
      : applied.operation == null || applied.document == null
        ? createCanvasInspectorNodeDraft(args.transformNode)
        : createCanvasRelationalTreeNodeDraft(
            args.transformNode,
            applied.operation,
            applied.document
          );
  return {
    ...semanticDraft,
    relationalAuthoringDraft:
      args.relationalAuthoringDraft === undefined
        ? semanticDraft.relationalAuthoringDraft
        : args.relationalAuthoringDraft === null
          ? null
          : removeAppliedRelations(args.relationalAuthoringDraft, applied.document),
  };
}
