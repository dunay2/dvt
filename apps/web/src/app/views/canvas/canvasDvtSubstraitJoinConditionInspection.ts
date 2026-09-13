/** Owned concern: inspect recursive JOIN predicates from canonical Substrait expressions. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';

import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import {
  DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
  isDvtSubstraitJoinNullOperator,
  type DvtSubstraitJoinComparisonCondition,
  type DvtSubstraitJoinCondition,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinPredicateOperator,
} from './canvasDvtSubstraitJoinCondition';
import {
  inspectDvtSubstraitJoinOperandExpression,
  type DvtSubstraitInspectedJoinOperand,
} from './canvasDvtSubstraitJoinOperand';

export type InspectedJoinCondition = DvtSubstraitJoinCondition<DvtSubstraitInspectedJoinOperand>;

export function comparisonFunctionIdentity(operator: DvtSubstraitJoinPredicateOperator) {
  return { urn: 'extension:io.substrait:functions_comparison', name: operator } as const;
}

export function booleanFunctionIdentity(combination: DvtSubstraitJoinConditionCombination) {
  return { urn: 'extension:io.substrait:functions_boolean', name: combination } as const;
}

function inspectJoinComparison(
  plan: Plan,
  expression: Expression | undefined
): DvtSubstraitJoinComparisonCondition<DvtSubstraitInspectedJoinOperand> | null {
  for (const operator of DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS) {
    const comparison = dvtSubstraitExpression.inspectScalarFunction(
      plan,
      expression,
      comparisonFunctionIdentity(operator)
    );
    if (comparison == null) continue;
    const unary = isDvtSubstraitJoinNullOperator(operator);
    if (
      comparison.arguments.length !== (unary ? 1 : 2) ||
      comparison.outputType?.kind.case !== 'bool'
    )
      return null;
    const left = inspectDvtSubstraitJoinOperandExpression(plan, comparison.arguments[0]!);
    if (left == null) return null;
    if (isDvtSubstraitJoinNullOperator(operator)) {
      return comparison.outputType.kind.value.nullability === Type_Nullability.REQUIRED
        ? { left, operator }
        : null;
    }
    const right = inspectDvtSubstraitJoinOperandExpression(plan, comparison.arguments[1]!);
    return right == null ? null : { left, right, operator };
  }
  return null;
}

function inspectJoinConditionTerm(
  plan: Plan,
  expression: Expression | undefined
): InspectedJoinCondition | null {
  const comparison = inspectJoinComparison(plan, expression);
  if (comparison != null) return comparison;
  const conditions = inspectJoinConditionList(plan, expression);
  return conditions == null ? null : { kind: 'group', conditions };
}

function inspectJoinConditionList(
  plan: Plan,
  expression: Expression | undefined
): readonly InspectedJoinCondition[] | null {
  const comparison = inspectJoinComparison(plan, expression);
  if (comparison != null) return [comparison];
  for (const combination of DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS) {
    const booleanExpression = dvtSubstraitExpression.inspectScalarFunction(
      plan,
      expression,
      booleanFunctionIdentity(combination)
    );
    if (
      booleanExpression == null ||
      booleanExpression.arguments.length !== 2 ||
      booleanExpression.outputType?.kind.case !== 'bool'
    )
      continue;
    const left = inspectJoinConditionList(plan, booleanExpression.arguments[0]);
    const right = inspectJoinConditionTerm(plan, booleanExpression.arguments[1]);
    return left == null || right == null ? null : [...left, { ...right, combination }];
  }
  return null;
}

export function inspectJoinConditionChain(plan: Plan, expression: Expression | undefined) {
  const conditions = inspectJoinConditionList(plan, expression);
  const [base, ...additionalConditions] = conditions ?? [];
  return base == null ||
    isDvtSubstraitJoinConditionGroup(base) ||
    isDvtSubstraitJoinNullCondition(base)
    ? null
    : { base: { ...base, operator: base.operator ?? 'equal' }, additionalConditions };
}
