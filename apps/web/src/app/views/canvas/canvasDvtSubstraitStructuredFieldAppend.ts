/** Owned concern: append one root field to an existing canonical struct. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  type Expression,
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

export function cloneDvtSubstraitExpression(expression: Expression): Expression {
  return fromBinary(ExpressionSchema, toBinary(ExpressionSchema, expression));
}

export function createDvtSubstraitFieldReference(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
}

export function appendDvtSubstraitProjectionFieldToStruct(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{ draggedFieldId: string; targetFieldId: string }>
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  const sourceParts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (!inspection.ok || sourceParts == null) return draft;
  const sourceCount = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.sourceRelation.relationId
  ).length;
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
  const dragged = roots[draggedIndex];
  const childFieldId = `${args.targetFieldId}:child:${args.draggedFieldId}`;
  if (
    dragged == null ||
    targetIndex < 0 ||
    targetChildren.length === 0 ||
    draft.sidecar.fields.some((field) => field.fieldId === childFieldId)
  )
    return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  const rootExpressions = parts.emit.outputMapping.map((mapping) =>
    mapping < sourceCount
      ? createDvtSubstraitFieldReference(mapping)
      : cloneDvtSubstraitExpression(parts.project.expressions[mapping - sourceCount]!)
  );
  const targetExpression = rootExpressions[targetIndex];
  const draggedExpression = rootExpressions[draggedIndex];
  if (
    targetExpression?.rexType.case !== 'nested' ||
    targetExpression.rexType.value.nestedType.case !== 'struct' ||
    draggedExpression == null
  ) {
    return draft;
  }
  targetExpression.rexType.value.nestedType.value.fields.push(draggedExpression);
  const targetMapping = parts.emit.outputMapping[targetIndex];
  if (targetMapping == null || targetMapping < sourceCount) return draft;
  parts.project.expressions[targetMapping - sourceCount] = targetExpression;
  const nested = draft.sidecar.fields.filter(
    (field) => field.relationId === parts.targetRelation.relationId && field.parentFieldId != null
  );
  next.sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields.filter(
        (field) => field.relationId !== parts.targetRelation.relationId
      ),
      ...roots,
      ...nested,
      {
        ...dragged,
        fieldId: childFieldId,
        parentFieldId: args.targetFieldId,
        outputOrdinal: targetChildren.length,
      },
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    roots.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
export function appendDvtSubstraitSourceFieldRoot(
  draft: DvtSubstraitProjectionDraft,
  args: Readonly<{ fieldId: string; sourceFieldName: string }>
): DvtSubstraitProjectionDraft {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  const sourceParts = resolveDvtSubstraitStructuredProjectionParts(draft);
  if (!inspection.ok || sourceParts == null) return draft;
  const sourceFields = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.sourceRelation.relationId
  );
  const roots = orderedDvtSubstraitFields(
    draft.sidecar.fields,
    sourceParts.targetRelation.relationId
  );
  const sourceIndex = sourceFields.findIndex((field) => field.displayName === args.sourceFieldName);
  const sourceField = sourceFields[sourceIndex];
  if (
    sourceField == null ||
    roots.some(
      (field) =>
        field.fieldId === args.fieldId ||
        field.displayName === args.sourceFieldName ||
        field.sourceFieldId === sourceField.fieldId
    )
  )
    return draft;

  const next = {
    plan: fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan)),
    sidecar: draft.sidecar,
  };
  const parts = resolveDvtSubstraitStructuredProjectionParts(next);
  if (parts == null) return draft;
  parts.emit.outputMapping = [...parts.emit.outputMapping, sourceIndex];
  const binding = {
    fieldId: args.fieldId,
    relationId: parts.targetRelation.relationId,
    sourceFieldId: sourceField.fieldId,
    outputOrdinal: roots.length,
    displayName: args.sourceFieldName,
  };
  next.sidecar = {
    ...draft.sidecar,
    fields: [...draft.sidecar.fields, binding],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    [...roots, binding].map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
