/** Owns shared recursive JOIN condition traversal; no Canvas or runtime dependency. */
import type {
  DvtSubstraitJoinOperand,
  DvtSubstraitJoinPredicateOperand,
} from './substraitJoinOperandReader.js';

export type JoinFieldOperand = Readonly<{ kind: 'field' }>;

export const DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS = [
  'equal',
  'not_equal',
  'gt',
  'gte',
  'lt',
  'lte',
] as const;

export type DvtSubstraitJoinComparisonOperator =
  (typeof DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS)[number];

export const DVT_SUBSTRAIT_JOIN_NULL_OPERATORS = ['is_null', 'is_not_null'] as const;

export const DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS = [
  ...DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  ...DVT_SUBSTRAIT_JOIN_NULL_OPERATORS,
] as const;

export type DvtSubstraitJoinPredicateOperator =
  (typeof DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS)[number];

export function isDvtSubstraitJoinNullOperator(
  operator: DvtSubstraitJoinPredicateOperator | undefined
): operator is (typeof DVT_SUBSTRAIT_JOIN_NULL_OPERATORS)[number] {
  return operator === 'is_null' || operator === 'is_not_null';
}

export const DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS = ['and', 'or'] as const;

export type DvtSubstraitJoinConditionCombination =
  (typeof DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS)[number];

export type DvtSubstraitJoinComparisonCondition<Operand> = Readonly<
  {
    kind?: 'comparison';
    left: Operand;
    combination?: DvtSubstraitJoinConditionCombination;
  } & (
    | { right: NoInfer<Operand>; operator?: DvtSubstraitJoinComparisonOperator }
    | { right?: never; operator: (typeof DVT_SUBSTRAIT_JOIN_NULL_OPERATORS)[number] }
  )
>;

export function isDvtSubstraitJoinNullCondition<Operand>(
  condition: DvtSubstraitJoinComparisonCondition<Operand>
): condition is Extract<
  DvtSubstraitJoinComparisonCondition<Operand>,
  {
    operator: (typeof DVT_SUBSTRAIT_JOIN_NULL_OPERATORS)[number];
  }
> {
  return isDvtSubstraitJoinNullOperator(condition.operator);
}

export type DvtSubstraitJoinCondition<Operand> =
  | DvtSubstraitJoinComparisonCondition<Operand>
  | Readonly<{
      kind: 'group';
      combination?: DvtSubstraitJoinConditionCombination;
      conditions: readonly DvtSubstraitJoinCondition<Operand>[];
    }>;

export type DvtSubstraitJoinPredicateCondition =
  DvtSubstraitJoinCondition<DvtSubstraitJoinPredicateOperand>;

export function isDvtSubstraitJoinConditionGroup<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): condition is Extract<DvtSubstraitJoinCondition<Operand>, { kind: 'group' }> {
  return condition.kind === 'group';
}

export function collectDvtSubstraitJoinConditionComparisons<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): readonly DvtSubstraitJoinComparisonCondition<Operand>[] {
  return isDvtSubstraitJoinConditionGroup(condition)
    ? condition.conditions.flatMap(collectDvtSubstraitJoinConditionComparisons)
    : [condition];
}

export function mapDvtSubstraitJoinConditionOperands<
  SourceField extends JoinFieldOperand,
  TargetField extends JoinFieldOperand,
>(
  condition: DvtSubstraitJoinCondition<DvtSubstraitJoinOperand<SourceField>>,
  mapOperand: (
    operand: DvtSubstraitJoinOperand<SourceField>
  ) => DvtSubstraitJoinOperand<TargetField> | null
): DvtSubstraitJoinCondition<DvtSubstraitJoinOperand<TargetField>> | null {
  if (isDvtSubstraitJoinConditionGroup(condition)) {
    const conditions = condition.conditions.map((child) =>
      mapDvtSubstraitJoinConditionOperands(child, mapOperand)
    );
    return conditions.some((child) => child == null)
      ? null
      : { ...condition, conditions: conditions.filter((child) => child != null) };
  }
  const left = mapOperand(condition.left);
  if (left == null) return null;
  if (isDvtSubstraitJoinNullCondition(condition)) {
    return condition.right === undefined ? { ...condition, left } : null;
  }
  const right = mapOperand(condition.right);
  return left == null || right == null ? null : { ...condition, left, right };
}

export function compactDvtSubstraitJoinConditionDefaults<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): DvtSubstraitJoinCondition<Operand> {
  if (isDvtSubstraitJoinConditionGroup(condition)) {
    return {
      kind: 'group',
      combination: condition.combination ?? 'and',
      conditions: condition.conditions.map(compactDvtSubstraitJoinConditionDefaults),
    };
  }
  if (isDvtSubstraitJoinNullCondition(condition)) {
    return {
      left: condition.left,
      operator: condition.operator,
      ...(condition.combination == null || condition.combination === 'and'
        ? {}
        : { combination: condition.combination }),
    };
  }
  return {
    left: condition.left,
    right: condition.right,
    ...(condition.operator == null || condition.operator === 'equal'
      ? {}
      : { operator: condition.operator }),
    ...(condition.combination == null || condition.combination === 'and'
      ? {}
      : { combination: condition.combination }),
  };
}

export function reduceDvtSubstraitJoinConditions<Operand, Result>(args: {
  conditions: readonly DvtSubstraitJoinCondition<Operand>[];
  comparison: (condition: DvtSubstraitJoinComparisonCondition<Operand>) => Result;
  combine: (
    combination: DvtSubstraitJoinConditionCombination,
    left: Result,
    right: Result
  ) => Result;
}): Result {
  const term = (condition: DvtSubstraitJoinCondition<Operand>): Result => {
    if (!isDvtSubstraitJoinConditionGroup(condition)) return args.comparison(condition);
    const [first, ...rest] = condition.conditions;
    if (first == null || rest.length === 0) {
      throw new Error('VTX2 JOIN condition groups require at least two conditions.');
    }
    return rest.reduce(
      (left, child) => args.combine(child.combination ?? 'and', left, term(child)),
      term(first)
    );
  };
  const [first, ...rest] = args.conditions;
  if (first == null) throw new Error('VTX2 JOIN requires at least one condition.');
  return rest.reduce(
    (left, condition) => args.combine(condition.combination ?? 'and', left, term(condition)),
    term(first)
  );
}
