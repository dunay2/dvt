/** Owned concern: create one canonical structured field from two flat projection outputs. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_NestedSchema,
  Expression_Nested_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import type { DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import {
  buildDvtSubstraitFieldTree,
  flattenDvtSubstraitFieldNames,
  inspectDvtSubstraitStructuredFieldDraft,
  orderedDvtSubstraitFields,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';
import {
  appendDvtSubstraitProjectionFieldToStruct,
  cloneDvtSubstraitExpression,
  createDvtSubstraitFieldReference,
} from './canvasDvtSubstraitStructuredFieldAppend';

export function composeDvtSubstraitProjectionFields(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{
    draggedFieldId: string;
    targetFieldId: string;
    parentFieldId: string;
    parentName: string;
  }>
): DvtSubstraitProjectionDraft {
  const parentName = args.parentName.trim();
  if (parentName.length === 0 || args.draggedFieldId === args.targetFieldId) return draft;
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  const sourceParts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (!inspection.ok || sourceParts == null) return draft;
  const roots = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId
  );
  const draggedIndex = roots.findIndex((field) => field.fieldId === args.draggedFieldId);
  const targetIndex = roots.findIndex((field) => field.fieldId === args.targetFieldId);
  const targetChildren = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId,
    args.targetFieldId
  );
  if (targetChildren.length > 0) return appendDvtSubstraitProjectionFieldToStruct(draft, args);
  const draggedChildren = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId,
    args.draggedFieldId
  );
  if (
    draggedIndex < 0 ||
    targetIndex < 0 ||
    draggedChildren.length > 0 ||
    draft.sidecar.fields.some(
      (field) =>
        field.relationId === sourceParts.targetRelation.relationId &&
        (field.fieldId === args.parentFieldId || field.displayName === parentName)
    )
  )
    return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  const sourceCount = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.sourceRelation.relationId
  ).length;
  const expressions = parts.emit.outputMapping.map((mapping) =>
    mapping < sourceCount
      ? createDvtSubstraitFieldReference(mapping)
      : cloneDvtSubstraitExpression(parts.project.expressions[mapping - sourceCount]!)
  );
  const childIndexes = [targetIndex, draggedIndex];
  const parentExpression = create(ExpressionSchema, {
    rexType: {
      case: 'nested',
      value: create(Expression_NestedSchema, {
        nestedType: {
          case: 'struct',
          value: create(Expression_Nested_StructSchema, {
            fields: childIndexes.map((index) => expressions[index]!),
          }),
        },
      }),
    },
  });
  const insertionIndex = Math.min(draggedIndex, targetIndex);
  const retained = roots
    .map((field, index) => ({ field, expression: expressions[index]! }))
    .filter((_, index) => !childIndexes.includes(index));
  retained.splice(insertionIndex, 0, {
    field: {
      ...roots[targetIndex]!,
      fieldId: args.parentFieldId,
      displayName: parentName,
    },
    expression: parentExpression,
  });
  parts.project.expressions = retained.map(({ expression }) => expression);
  parts.emit.outputMapping = retained.map((_, index) => sourceCount + index);

  const parentBinding = {
    fieldId: args.parentFieldId,
    relationId: parts.targetRelation.relationId,
    outputOrdinal: insertionIndex,
    displayName: parentName,
  };
  const retainedBindings = retained.map(({ field }, outputOrdinal) =>
    field.fieldId === args.parentFieldId ? parentBinding : { ...field, outputOrdinal }
  );
  const children = childIndexes.map((index, outputOrdinal) => ({
    ...roots[index]!,
    parentFieldId: args.parentFieldId,
    outputOrdinal,
  }));
  const existingChildren = draft.sidecar.fields.filter(
    (field) => field.relationId === parts.targetRelation.relationId && field.parentFieldId != null
  );
  next.sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields.filter(
        (field) => field.relationId !== parts.targetRelation.relationId
      ),
      ...retainedBindings,
      ...existingChildren,
      ...children,
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    retainedBindings.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
