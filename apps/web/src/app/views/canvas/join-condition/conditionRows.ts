/** Pure readable projection of canonical condition groups and operand expressions. */
import type {
  DvtSubstraitJoinPredicateOperator,
  DvtSubstraitJoinComparisonCondition,
  DvtSubstraitJoinPredicateCondition,
} from '../canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinConditionKey,
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
} from '../canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  type DvtSubstraitJoinPredicateOperand,
} from '../canvasDvtSubstraitJoinOperand';
export const COMPARISON_LABEL: Readonly<Record<DvtSubstraitJoinPredicateOperator, string>> = {
  equal: '=',
  not_equal: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  is_null: 'IS NULL',
  is_not_null: 'IS NOT NULL',
};

export type SemanticWorkbenchJoinConditionRow =
  | Readonly<{ kind: 'group-open' | 'group-close'; depth: number; label: string }>
  | Readonly<{
      kind: 'comparison';
      depth: number;
      label: string;
      conditionKey: string;
      condition: DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>;
      combinationEditable: boolean;
    }>;

const predicateOperandKey = (operand: DvtSubstraitJoinPredicateOperand) =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

function literalText(operand: Extract<DvtSubstraitJoinPredicateOperand, { kind: 'literal' }>) {
  return operand.literal.dataType === 'string'
    ? `'${operand.literal.value}'`
    : String(operand.literal.value);
}

function operandText(
  operand: DvtSubstraitJoinPredicateOperand,
  fieldLabelById: ReadonlyMap<string, string>,
  functionNameById: ReadonlyMap<string, string>
): string {
  if (operand.kind === 'field') {
    return fieldLabelById.get(operand.sourceFieldId) ?? operand.sourceFieldId;
  }
  if (operand.kind === 'literal') return literalText(operand);
  const name = functionNameById.get(operand.capabilityId) ?? operand.capabilityId;
  return `${name.toUpperCase()}(${operandText(operand.input, fieldLabelById, functionNameById)})`;
}

export function projectSemanticWorkbenchJoinConditionRows(args: {
  conditions: readonly DvtSubstraitJoinPredicateCondition[];
  fieldLabelById: ReadonlyMap<string, string>;
  functionNameById?: ReadonlyMap<string, string>;
}): readonly SemanticWorkbenchJoinConditionRow[] {
  const rows: SemanticWorkbenchJoinConditionRow[] = [];
  const functionNameById = args.functionNameById ?? new Map<string, string>();
  const visit = (
    condition: DvtSubstraitJoinPredicateCondition,
    depth: number,
    showCombination: boolean
  ) => {
    const combination = condition.combination ?? 'and';
    if (isDvtSubstraitJoinConditionGroup(condition)) {
      rows.push({
        kind: 'group-open',
        depth,
        label: `${showCombination ? `${combination.toUpperCase()} ` : ''}(`,
      });
      condition.conditions.forEach((child, index) => visit(child, depth + 1, index > 0));
      rows.push({ kind: 'group-close', depth, label: ')' });
      return;
    }
    rows.push({
      kind: 'comparison',
      depth,
      label: `${showCombination ? `${combination.toUpperCase()} ` : ''}${operandText(
        condition.left,
        args.fieldLabelById,
        functionNameById
      )} ${COMPARISON_LABEL[condition.operator ?? 'equal']}${
        isDvtSubstraitJoinNullCondition(condition)
          ? ''
          : ` ${operandText(condition.right, args.fieldLabelById, functionNameById)}`
      }`,
      conditionKey: dvtSubstraitJoinConditionKey(condition, predicateOperandKey),
      condition,
      combinationEditable: showCombination,
    });
  };
  args.conditions.forEach((condition, index) => visit(condition, 0, index > 0));
  return rows;
}
