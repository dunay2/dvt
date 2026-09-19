/** Owned concern: retire one relational card through the canonical draft builders. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  inspectDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinPredicateContext,
  retainDvtSubstraitJoinInputs,
  restoreDvtSubstraitJoinContext,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { createProjectionType } from './canvasDvtSubstraitProjectionStructure';
import { inspectDvtSubstraitUnionAllAcceptedDraft } from './canvasDvtSubstraitSetComposition';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import { removeDvtSubstraitProjectionRoot } from './canvasDvtSubstraitStructuredFieldRemove';

export type CanvasRelationalRemovalResult =
  | Readonly<{
      ok: true;
      draft: DvtSubstraitJoinDraft;
      operation: 'inner_join' | 'left_join' | 'projection' | 'union_all';
      retained: readonly number[];
    }>
  | Readonly<{
      ok: false;
      reason: 'unavailable' | 'dependent-condition' | 'unsupported-projection-type';
    }>
  | Readonly<{
      ok: false;
      reason: 'dependent-operations';
      operations: readonly string[];
      proposal: Extract<CanvasRelationalRemovalResult, { ok: true }>;
    }>;

function operationForJoinDraft(draft: DvtSubstraitJoinDraft): 'inner_join' | 'left_join' | null {
  const context = inspectDvtSubstraitJoinPredicateContext(draft);
  if (context == null || !context.inspection.ok) return null;
  return context.inspection.projection.joinRelations.at(-1)?.joinType === JoinRel_JoinType.LEFT
    ? 'left_join'
    : 'inner_join';
}

export function removeCanvasRelationalTreeNode(
  args: Readonly<{
    draft: DvtSubstraitJoinDraft;
    relationId: string;
    targetNodeId: string;
    keep?: 'left' | 'right';
  }>
): CanvasRelationalRemovalResult {
  const root = args.draft.plan.relations[0]?.relType;
  const rel = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (rel?.case === 'project') {
    const input = rel.value.input?.relType;
    if (input?.case === 'filter') {
      const filterId = args.draft.sidecar.relations.find(
        (binding) => binding.relAnchor === input.value.common?.relAnchor
      )?.relationId;
      if (filterId === args.relationId) {
        const draft = removeDvtSubstraitFilter(args.draft);
        if (draft !== args.draft)
          return { ok: true, draft, operation: 'projection', retained: [0] };
      }
    }
    const projection = inspectDvtSubstraitProjectionDraft(args.draft);
    if (projection.ok && projection.projection.targetRelationId === args.relationId) {
      const windows = projection.projection.outputs.filter(
        (field) => field.calculation?.kind === 'row-number'
      );
      const draft = windows.reduce(
        (current, field) => removeDvtSubstraitProjectionRoot(current, { fieldId: field.fieldId }),
        args.draft
      );
      if (draft !== args.draft) return { ok: true, draft, operation: 'projection', retained: [0] };
    }
  }
  if (rel?.case === 'aggregate' || rel?.case === 'project') {
    const rootId = args.draft.sidecar.relations.find(
      (binding) => binding.relAnchor === rel.value.common?.relAnchor
    )?.relationId;
    if (rootId === args.relationId) {
      const join = inspectDvtSubstraitJoinAcceptedDraft(args.draft);
      const union = inspectDvtSubstraitUnionAllAcceptedDraft(args.draft);
      const draft = applyCanvasRelationalOperatorTool(args.draft, {
        tool: rel.case === 'aggregate' ? 'aggregate' : 'window',
        remove: true,
      });
      if (draft !== args.draft && (join.ok || union.ok))
        return {
          ok: true,
          draft,
          operation: join.ok ? (operationForJoinDraft(draft) ?? 'inner_join') : 'union_all',
          retained: (join.ok
            ? inspectDvtSubstraitJoinPredicateContext(args.draft)!.inspection.projection.inputs
            : union.ok
              ? union.projection.inputs
              : []
          ).map((_, index) => index),
        };
    }
  }
  const context = inspectDvtSubstraitJoinPredicateContext(args.draft);
  if (context != null && context.baseDraft !== args.draft) {
    const baseIds = new Set(
      context.baseDraft.sidecar.relations.map((binding) => binding.relationId)
    );
    const wrappers = args.draft.sidecar.relations.filter(
      (binding) => !baseIds.has(binding.relationId)
    );
    const wrapperIndex = wrappers.findIndex((binding) => binding.relationId === args.relationId);
    const result =
      wrapperIndex >= 0
        ? {
            ok: true as const,
            draft: context.baseDraft,
            operation: operationForJoinDraft(context.baseDraft) ?? 'inner_join',
            retained: context.inspection.projection.inputs.map((_, index) => index),
          }
        : removeCanvasRelationalTreeNode({ ...args, draft: context.baseDraft });
    if (!result.ok) return result;
    if (wrapperIndex < 0) {
      const restored = restoreDvtSubstraitJoinContext(args.draft, context.baseDraft, result.draft);
      if (restored !== args.draft) return { ...result, draft: restored };
    }
    return {
      ok: false,
      reason: 'dependent-operations',
      operations: wrappers
        .map((_, index) => (index === 0 ? 'AGGREGATE' : 'WINDOW'))
        .slice(wrapperIndex >= 0 ? wrapperIndex + 1 : 0),
      proposal: result,
    };
  }
  const inspection = inspectDvtSubstraitJoinDraft(args.draft);
  if (!inspection.ok) return { ok: false, reason: 'dependent-condition' };
  const { projection } = inspection;
  const sourceIndex = projection.inputs.findIndex((input) => input.relationId === args.relationId);
  const joinIndex = projection.joinRelations.findIndex(
    (join) => join.relationId === args.relationId
  );
  if (sourceIndex < 0 && (joinIndex < 0 || args.keep == null))
    return { ok: false, reason: 'unavailable' };
  const retained = projection.inputs
    .map((_, index) => index)
    .filter((index) =>
      sourceIndex >= 0
        ? index !== sourceIndex
        : args.keep === 'left'
          ? index !== joinIndex + 1
          : index > joinIndex
    );
  if (retained.length > 1) {
    const draft = retainDvtSubstraitJoinInputs(args.draft, retained);
    return draft == null
      ? { ok: false, reason: 'dependent-condition' }
      : { ok: true, draft, operation: operationForJoinDraft(draft) ?? 'inner_join', retained };
  }
  const inputIndex = retained[0];
  const input = inputIndex == null ? undefined : projection.inputs[inputIndex];
  if (input == null) return { ok: false, reason: 'unavailable' };
  if (
    input.fields.some((field) => createProjectionType(field.dataType).kind.case !== field.dataType)
  )
    return { ok: false, reason: 'unsupported-projection-type' };
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      ...input,
      nodeId: input.relationId,
      fields: input.fields.map((field) => ({ name: field.name, dataType: field.dataType })),
    },
    targetNodeId: args.targetNodeId,
    outputs: projection.outputs
      .filter((field) => field.source.inputIndex === inputIndex)
      .map((field) => ({
        fieldId: field.fieldId,
        name: field.name,
        sourceFieldName: field.source.name,
      })),
  });
  const allocatedSourceId = draft.sidecar.relations[0]!.relationId;
  const fieldIds = new Map(
    draft.sidecar.fields
      .filter((field) => field.relationId === allocatedSourceId)
      .map((field) => [
        field.fieldId,
        input.fields.find((prior) => prior.name === field.displayName)!.fieldId,
      ])
  );
  return {
    ok: true,
    operation: 'projection',
    retained,
    draft: {
      ...draft,
      sidecar: {
        ...draft.sidecar,
        relations: draft.sidecar.relations.map((rel) =>
          rel.relationId === allocatedSourceId ? { ...rel, relationId: input.relationId } : rel
        ),
        fields: draft.sidecar.fields.map((field) => ({
          ...field,
          fieldId: fieldIds.get(field.fieldId) ?? field.fieldId,
          relationId: field.relationId === allocatedSourceId ? input.relationId : field.relationId,
          ...(field.sourceFieldId == null
            ? {}
            : { sourceFieldId: fieldIds.get(field.sourceFieldId) ?? field.sourceFieldId }),
        })),
      },
    },
  };
}
