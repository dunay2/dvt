/** Owns ordinal-to-identity predicate binding and operand type validation. */
import {
  mapDvtSubstraitJoinConditionOperands,
  collectDvtSubstraitJoinConditionComparisons,
  isDvtSubstraitJoinNullCondition,
  compactDvtSubstraitJoinConditionDefaults,
  type DvtSubstraitJoinPredicateCondition,
} from '../substraitJoinCondition.js';
import type { InspectedJoinCondition } from '../substraitJoinConditionInspection.js';
import {
  mapDvtSubstraitJoinOperandFields,
  resolveDvtSubstraitJoinOperandDataType,
  type DvtSubstraitJoinPredicateOperand,
} from '../substraitJoinOperandReader.js';
import type {
  DvtSubstraitJoinDataType,
  JoinOriginField,
  InspectedJoinPredicateOperand,
} from '../substraitJoinReadModel.js';

export function inspectJoinPredicates(
  inspectedConditions: readonly InspectedJoinCondition[],
  predicateFields: readonly JoinOriginField[]
): readonly DvtSubstraitJoinPredicateCondition[] | null {
  const conditions: DvtSubstraitJoinPredicateCondition[] = [];
  const convertOperand = (
    operand: InspectedJoinPredicateOperand
  ): DvtSubstraitJoinPredicateOperand | null => {
    return mapDvtSubstraitJoinOperandFields(operand, (field) => {
      const origin = predicateFields[field.ordinal];
      return origin == null ? null : { kind: 'field', sourceFieldId: origin.fieldId };
    });
  };
  for (const condition of inspectedConditions) {
    const converted = mapDvtSubstraitJoinConditionOperands(condition, convertOperand);
    if (converted == null) return null;
    const operandType = (
      operand: DvtSubstraitJoinPredicateOperand
    ): DvtSubstraitJoinDataType | null =>
      resolveDvtSubstraitJoinOperandDataType(
        operand,
        (field) =>
          predicateFields.find((candidate) => candidate.fieldId === field.sourceFieldId)
            ?.dataType ?? null
      );
    for (const comparison of collectDvtSubstraitJoinConditionComparisons(converted)) {
      if (
        operandType(comparison.left) == null ||
        (!isDvtSubstraitJoinNullCondition(comparison) &&
          operandType(comparison.left) !== operandType(comparison.right))
      ) {
        return null;
      }
    }
    conditions.push(compactDvtSubstraitJoinConditionDefaults(converted));
  }
  return conditions;
}
