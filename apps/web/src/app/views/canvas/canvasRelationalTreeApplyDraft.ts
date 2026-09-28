/** Project the exact node draft submitted by the relational authoring transaction. */
import {
  DvtRelationalAuthoringDraftV1Schema,
  type DvtRelationalAuthoringDraftV1,
} from '@dvt/contracts';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { CanvasStagedOperationKind } from './canvasStagedOperation';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';

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
): DvtRelationalAuthoringDraftV1 {
  if (document == null) return draft;
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) return draft;
  const appliedIds = new Set(indexed.index.relations.keys());
  return DvtRelationalAuthoringDraftV1Schema.parse({
    ...draft,
    sources: draft.sources.filter((source) => !appliedIds.has(source.relationId)),
    operations: draft.operations.filter((operation) => !appliedIds.has(operation.relationId)),
  });
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
