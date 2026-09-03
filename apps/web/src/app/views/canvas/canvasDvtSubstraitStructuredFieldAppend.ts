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
  if (draggedIndex < 0 || targetIndex < 0 || targetChildren.length === 0) return draft;

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
  const retainedExpressions = rootExpressions.filter((_, index) => index !== draggedIndex);
  parts.project.expressions = retainedExpressions;
  parts.emit.outputMapping = retainedExpressions.map((_, index) => sourceCount + index);

  const retainedRoots = roots
    .filter((_, index) => index !== draggedIndex)
    .map((field, outputOrdinal) => ({ ...field, outputOrdinal }));
  const nested = draft.sidecar.fields.filter(
    (field) => field.relationId === parts.targetRelation.relationId && field.parentFieldId != null
  );
  next.sidecar = {
    ...draft.sidecar,
    fields: [
      ...draft.sidecar.fields.filter(
        (field) => field.relationId !== parts.targetRelation.relationId
      ),
      ...retainedRoots,
      ...nested,
      {
        ...roots[draggedIndex]!,
        parentFieldId: args.targetFieldId,
        outputOrdinal: targetChildren.length,
      },
    ],
  };
  parts.root.names = flattenDvtSubstraitFieldNames(
    retainedRoots.map((field) => buildDvtSubstraitFieldTree(field, next.sidecar.fields))
  );
  return inspectDvtSubstraitStructuredFieldDraft(next).ok ? next : draft;
}
