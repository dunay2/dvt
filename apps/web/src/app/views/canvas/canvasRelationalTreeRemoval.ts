/** Owned concern: retire one relational card through the canonical draft builders. */
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
import { retainCanvasJoinReadProjection } from './relational-source-occurrence/retainedReadProjection';
import {
  inspectDvtSubstraitUnionAllAcceptedDraft,
  inspectDvtSubstraitUnionAllDraft,
  resolveDvtSubstraitSetOperation,
} from './canvasDvtSubstraitSetComposition';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { removeDvtSubstraitProjectionRoot } from './canvasDvtSubstraitStructuredFieldRemove';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { canvasJoinOperationForType, isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { inspectDvtSubstraitCrossDraft } from '@dvt/postgres-projection';
import { createDvtSubstraitCrossDraft } from './canvasDvtSubstraitCrossComposition';
import {
  peelCanvasDvtSubstraitSortFetch,
  restoreCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';

export type CanvasRelationalRemovalResult =
  | Readonly<{
      ok: true;
      draft: DvtSubstraitJoinDraft;
      operation: CanvasRelationalOperation;
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

function operationForJoinDraft(draft: DvtSubstraitJoinDraft): CanvasRelationalOperation | null {
  const context = inspectDvtSubstraitJoinPredicateContext(
    peelCanvasDvtSubstraitSortFetch(draft).base
  );
  if (context == null || !context.inspection.ok) return null;
  const joinType = context.inspection.projection.joinRelations.at(-1)?.joinType;
  const operation = joinType == null ? null : canvasJoinOperationForType(joinType);
  return isCanvasJoinOperation(operation) ? operation : null;
}

export function removeCanvasRelationalTreeNode(
  args: Readonly<{
    draft: DvtSubstraitJoinDraft;
    relationId: string;
    targetNodeId: string;
    keep?: 'left' | 'right';
  }>
): CanvasRelationalRemovalResult {
  const sortFetchChain = peelCanvasDvtSubstraitSortFetch(args.draft);
  if (sortFetchChain.wrappers.length > 0) {
    const result = removeCanvasRelationalTreeNode({ ...args, draft: sortFetchChain.base });
    if (!result.ok) return result;
    const restored = restoreCanvasDvtSubstraitSortFetch(sortFetchChain, result.draft);
    if (restored != null) return { ...result, draft: restored };
    return {
      ok: false,
      reason: 'dependent-operations',
      operations: sortFetchChain.wrappers.map((wrapper) =>
        wrapper.operation === 'sort' ? 'ORDER BY' : 'LIMIT / OFFSET'
      ),
      proposal: result,
    };
  }
  const root = args.draft.plan.relations[0]?.relType;
  const rel = root?.case === 'root' ? root.value.input?.relType : undefined;
  if (rel?.case === 'project') {
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
      if (draft !== args.draft && join.ok) {
        return {
          ok: true,
          draft,
          operation: operationForJoinDraft(draft) ?? 'inner_join',
          retained: inspectDvtSubstraitJoinPredicateContext(
            args.draft
          )!.inspection.projection.inputs.map((_, index) => index),
        };
      }
      if (draft !== args.draft && union.ok) {
        const set = inspectDvtSubstraitUnionAllDraft(draft);
        const setOperation = resolveDvtSubstraitSetOperation(draft);
        return {
          ok: true,
          draft,
          operation: set.ok
            ? set.projection.operation
            : (setOperation ?? union.projection.operation),
          retained: union.projection.inputs.map((_, index) => index),
        };
      }
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
  const cross = inspectDvtSubstraitCrossDraft(args.draft);
  if (cross.ok) {
    const { projection } = cross;
    const sourceIndex = projection.inputs.findIndex(
      (input) => input.relationId === args.relationId
    );
    const crossIndex = projection.crossRelations.findIndex(
      (relation) => relation.relationId === args.relationId
    );
    if (sourceIndex < 0 && (crossIndex < 0 || args.keep == null)) {
      return { ok: false, reason: 'unavailable' };
    }
    const retained = projection.inputs
      .map((_, index) => index)
      .filter((index) =>
        sourceIndex >= 0
          ? index !== sourceIndex
          : args.keep === 'left'
            ? index !== crossIndex + 1
            : index > crossIndex
      );
    if (retained.length > 1) {
      try {
        const draft = createDvtSubstraitCrossDraft({
          previousDraft: args.draft,
          inputs: retained.map((index) => {
            const input = projection.inputs[index]!;
            return {
              nodeId: input.relationId,
              schema: input.schema,
              table: input.table,
              sourceRef: input.sourceRef,
              fields: input.fields.map((field) => ({
                name: field.name,
                dataType: field.dataType,
                joinDataType: field.dataType,
                nullable: field.nullable,
              })),
            };
          }),
        });
        return { ok: true, draft, operation: 'cross_join', retained };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    }
    const inputIndex = retained[0];
    const input = inputIndex == null ? undefined : projection.inputs[inputIndex];
    if (input == null) return { ok: false, reason: 'unavailable' };
    if (
      input.fields.some(
        (field) => createProjectionType(field.dataType).kind.case !== field.dataType
      )
    ) {
      return { ok: false, reason: 'unsupported-projection-type' };
    }
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
    return { ok: true, draft, operation: 'projection', retained };
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
  const draft = retainCanvasJoinReadProjection({
    original: args.draft,
    input,
    targetNodeId: args.targetNodeId,
    outputs: projection.outputs.filter((field) => field.source.inputIndex === inputIndex),
  });
  return draft == null
    ? { ok: false, reason: 'unsupported-projection-type' }
    : { ok: true, operation: 'projection', retained, draft };
}
