/** Owned concern: reorder children inside one canonical structured output. */
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
  inspectDvtSubstraitStructuredFieldDraft,
  orderedDvtSubstraitFields,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';

export function reorderDvtSubstraitStructuredFieldChildren(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{
    parentFieldId: string;
    fieldId: string;
    targetFieldId: string;
    placement: 'before' | 'after';
  }>
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  const sourceParts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (!inspection.ok || sourceParts == null || args.fieldId === args.targetFieldId) return draft;
  const roots = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId
  );
  const siblings = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId,
    args.parentFieldId
  );
  const parentIndex = roots.findIndex((field) => field.fieldId === args.parentFieldId);
  const fieldIndex = siblings.findIndex((field) => field.fieldId === args.fieldId);
  const targetIndex = siblings.findIndex((field) => field.fieldId === args.targetFieldId);
  if (parentIndex < 0 || fieldIndex < 0 || targetIndex < 0) return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  const sourceCount = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    parts.sourceRelation.relationId
  ).length;
  const parentMapping = parts.emit.outputMapping[parentIndex];
  if (parentMapping == null || parentMapping < sourceCount) return draft;
  const parentExpression = parts.project.expressions[parentMapping - sourceCount];
  if (
    parentExpression?.rexType.case !== 'nested' ||
    parentExpression.rexType.value.nestedType.case !== 'struct'
  )
    return draft;

  const reordered = [...siblings];
  const [moved] = reordered.splice(fieldIndex, 1);
  const insertionIndex = reordered.findIndex((field) => field.fieldId === args.targetFieldId);
  if (moved == null || insertionIndex < 0) return draft;
  reordered.splice(args.placement === 'after' ? insertionIndex + 1 : insertionIndex, 0, moved);
  const expressions = parentExpression.rexType.value.nestedType.value.fields;
  const expressionByFieldId = new Map(
    siblings.map((field, index) => [field.fieldId, expressions[index]!])
  );
  parentExpression.rexType.value.nestedType.value.fields = reordered.map((field) =>
    expressionByFieldId.get(field.fieldId)!
  );
  const ordinalById = new Map(reordered.map((field, index) => [field.fieldId, index]));
  next.sidecar = {
    ...draft.sidecar,
    fields: draft.sidecar.fields.map((field) => {
      const ordinal = ordinalById.get(field.fieldId);
      return ordinal == null ? field : { ...field, outputOrdinal: ordinal };
    }),
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    roots.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
