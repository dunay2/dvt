import type { DvtSubstraitNInputJoinProjection } from '@dvt/postgres-projection';

import {
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
} from './canvasDvtSubstraitJoinCondition';

/** Owned concern: the exact admitted legacy binary INNER JOIN shape. */
export const DVT_SUBSTRAIT_INNER_JOIN_LEFT_FIELD_NAMES = ['customer_id', 'name'] as const;
export const DVT_SUBSTRAIT_INNER_JOIN_RIGHT_FIELD_NAMES = ['order_id', 'customer_id'] as const;

export const DVT_SUBSTRAIT_INNER_JOIN_OUTPUT_FIELDS = [
  {
    fieldKey: 'left.customer_id',
    outputMapping: 0,
    defaultName: 'customer_id',
    source: { relation: 'left', name: 'customer_id' },
    locator: { inputIndex: 0, fieldName: 'customer_id' },
  },
  {
    fieldKey: 'left.name',
    outputMapping: 1,
    defaultName: 'name',
    source: { relation: 'left', name: 'name' },
    locator: { inputIndex: 0, fieldName: 'name' },
  },
  {
    fieldKey: 'right.order_id',
    outputMapping: 2,
    defaultName: 'order_id',
    source: { relation: 'right', name: 'order_id' },
    locator: { inputIndex: 1, fieldName: 'order_id' },
  },
] as const;

function fieldIdForLocator(
  projection: DvtSubstraitNInputJoinProjection,
  locator: Readonly<{ inputIndex: number; fieldName: string }>
): string | null {
  return (
    projection.inputs[locator.inputIndex]?.fields.find((field) => field.name === locator.fieldName)
      ?.fieldId ?? null
  );
}

export function hasDvtSubstraitLegacyBinaryInnerJoinShape(
  projection: DvtSubstraitNInputJoinProjection
): boolean {
  if (
    projection.inputs.length !== 2 ||
    projection.inputs[0]?.fields.map((field) => field.name).join(',') !==
      DVT_SUBSTRAIT_INNER_JOIN_LEFT_FIELD_NAMES.join(',') ||
    projection.inputs[1]?.fields.map((field) => field.name).join(',') !==
      DVT_SUBSTRAIT_INNER_JOIN_RIGHT_FIELD_NAMES.join(',') ||
    projection.joins.length !== 1
  ) {
    return false;
  }

  const leftKeyId = fieldIdForLocator(projection, { inputIndex: 0, fieldName: 'customer_id' });
  const rightKeyId = fieldIdForLocator(projection, { inputIndex: 1, fieldName: 'customer_id' });
  const predicate = projection.joins[0]?.conditions[0];
  if (
    leftKeyId == null ||
    rightKeyId == null ||
    predicate == null ||
    isDvtSubstraitJoinConditionGroup(predicate) ||
    isDvtSubstraitJoinNullCondition(predicate) ||
    predicate.left.kind !== 'field' ||
    predicate.right.kind !== 'field' ||
    predicate.left.sourceFieldId !== leftKeyId ||
    predicate.right.sourceFieldId !== rightKeyId ||
    (predicate.operator ?? 'equal') !== 'equal' ||
    projection.joins[0]!.conditions.length !== 1
  ) {
    return false;
  }

  return projection.outputs.every((output) =>
    DVT_SUBSTRAIT_INNER_JOIN_OUTPUT_FIELDS.some(
      (field) =>
        field.locator.inputIndex === output.source.inputIndex &&
        field.locator.fieldName === output.source.name
    )
  );
}
