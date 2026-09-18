/** Owned concern: retire one relational card through the canonical draft builders. */
import {
  inspectDvtSubstraitNInputJoinDraft,
  retainDvtSubstraitJoinInputs,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { createProjectionType } from './canvasDvtSubstraitProjectionStructure';

export type CanvasRelationalRemovalResult =
  | Readonly<{
      ok: true;
      draft: DvtSubstraitInnerJoinDraft;
      operation: 'inner_join' | 'projection';
      retained: readonly number[];
    }>
  | Readonly<{
      ok: false;
      reason: 'unavailable' | 'dependent-condition' | 'unsupported-projection-type';
    }>;

export function removeCanvasRelationalTreeNode(
  args: Readonly<{
    draft: DvtSubstraitInnerJoinDraft;
    relationId: string;
    targetNodeId: string;
    keep?: 'left' | 'right';
  }>
): CanvasRelationalRemovalResult {
  const inspection = inspectDvtSubstraitNInputJoinDraft(args.draft);
  if (!inspection.ok) return { ok: false, reason: 'unavailable' };
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
      : { ok: true, draft, operation: 'inner_join', retained };
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
