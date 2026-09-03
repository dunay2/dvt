/** Owned concern: create one canonical structured field from two flat projection outputs. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_NestedSchema,
  Expression_Nested_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
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
  const flat = inspectDvtSubstraitProjectionDraft(draft);
  const parentName = args.parentName.trim();
  if (parentName.length === 0 || args.draggedFieldId === args.targetFieldId) return draft;
  if (!flat.ok) return appendDvtSubstraitProjectionFieldToStruct(draft, args);
  const outputs = flat.projection.outputs;
  const draggedIndex = outputs.findIndex((field) => field.fieldId === args.draggedFieldId);
  const targetIndex = outputs.findIndex((field) => field.fieldId === args.targetFieldId);
  if (
    draggedIndex < 0 ||
    targetIndex < 0 ||
    outputs.some((field) => field.fieldId === args.parentFieldId || field.name === parentName)
  )
    return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  const sourceCount = flat.projection.source.fields.length;
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
  const retained = outputs
    .map((field, index) => ({ field, expression: expressions[index]! }))
    .filter((_, index) => !childIndexes.includes(index));
  retained.splice(insertionIndex, 0, {
    field: { ...outputs[targetIndex]!, fieldId: args.parentFieldId, name: parentName },
    expression: parentExpression,
  });
  parts.project.expressions = retained.map(({ expression }) => expression);
  parts.emit.outputMapping = retained.map((_, index) => sourceCount + index);

  const targetBindings = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    parts.targetRelation.relationId
  );
  const bindingById = new Map(targetBindings.map((field) => [field.fieldId, field]));
  const parentBinding = {
    fieldId: args.parentFieldId,
    relationId: parts.targetRelation.relationId,
    outputOrdinal: insertionIndex,
    displayName: parentName,
  };
  const retainedBindings = retained.map(({ field }, outputOrdinal) =>
    field.fieldId === args.parentFieldId
      ? parentBinding
      : { ...bindingById.get(field.fieldId)!, outputOrdinal }
  );
  const children = childIndexes.map((index, outputOrdinal) => ({
    ...bindingById.get(outputs[index]!.fieldId)!,
    parentFieldId: args.parentFieldId,
    outputOrdinal,
  }));
  next.sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields.filter(
        (field) => field.relationId !== parts.targetRelation.relationId
      ),
      ...retainedBindings,
      ...children,
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    retainedBindings.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
