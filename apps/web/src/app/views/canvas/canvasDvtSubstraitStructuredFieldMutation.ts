/** Owned concern: create one canonical structured field from two flat projection outputs. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_NestedSchema,
  Expression_Nested_StructSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { PostgresIdentifierV1Schema } from '@dvt/contracts';

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
  const parentName = args.parentName;
  if (
    !PostgresIdentifierV1Schema.safeParse(parentName).success ||
    args.draggedFieldId === args.targetFieldId
  )
    return draft;
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
  const parentOrdinal = roots.length;
  const parentMapping = sourceCount + parts.project.expressions.length;
  parts.project.expressions = [...parts.project.expressions, parentExpression];
  parts.emit.outputMapping = [...parts.emit.outputMapping, parentMapping];

  const parentBinding = {
    fieldId: args.parentFieldId,
    relationId: parts.targetRelation.relationId,
    outputOrdinal: parentOrdinal,
    displayName: parentName,
  };
  const children = childIndexes.map((index, outputOrdinal) => ({
    ...roots[index]!,
    fieldId: `${args.parentFieldId}:child:${roots[index]!.fieldId}`,
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
      ...roots,
      ...existingChildren,
      parentBinding,
      ...children,
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    [...roots, parentBinding].map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
