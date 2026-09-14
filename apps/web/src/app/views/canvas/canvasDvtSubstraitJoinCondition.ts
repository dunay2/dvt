import {
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinComparisonCondition,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinCondition,
  isDvtSubstraitJoinConditionGroup,
  collectDvtSubstraitJoinConditionComparisons,
} from '@dvt/postgres-projection';
export {
  type JoinFieldOperand,
  DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  type DvtSubstraitJoinComparisonOperator,
  DVT_SUBSTRAIT_JOIN_NULL_OPERATORS,
  DVT_SUBSTRAIT_JOIN_PREDICATE_OPERATORS,
  type DvtSubstraitJoinPredicateOperator,
  isDvtSubstraitJoinNullOperator,
  DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinComparisonCondition,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinCondition,
  type DvtSubstraitJoinPredicateCondition,
  isDvtSubstraitJoinConditionGroup,
  collectDvtSubstraitJoinConditionComparisons,
  mapDvtSubstraitJoinConditionOperands,
  compactDvtSubstraitJoinConditionDefaults,
  reduceDvtSubstraitJoinConditions,
} from '@dvt/postgres-projection';
/** Owned concern: represent and traverse recursive boolean JOIN conditions. */
import type {
  DvtSubstraitJoinOperand,
  DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';

export function dvtSubstraitJoinConditionOperands<Operand>(
  condition: DvtSubstraitJoinComparisonCondition<Operand>
): readonly Operand[] {
  return isDvtSubstraitJoinNullCondition(condition)
    ? [condition.left]
    : [condition.left, condition.right];
}

export function countDvtSubstraitJoinConditionComparisons<Operand>(
  conditions: readonly DvtSubstraitJoinCondition<Operand>[]
): number {
  return conditions.reduce(
    (count, condition) => count + collectDvtSubstraitJoinConditionComparisons(condition).length,
    0
  );
}

export function collectDvtSubstraitJoinConditionCombinations<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): readonly DvtSubstraitJoinConditionCombination[] {
  return [
    condition.combination ?? 'and',
    ...(isDvtSubstraitJoinConditionGroup(condition)
      ? condition.conditions.flatMap(collectDvtSubstraitJoinConditionCombinations)
      : []),
  ];
}

export function hasValidDvtSubstraitJoinConditionGroups<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): boolean {
  return (
    !isDvtSubstraitJoinConditionGroup(condition) ||
    (condition.conditions.length >= 2 &&
      condition.conditions.every(hasValidDvtSubstraitJoinConditionGroups))
  );
}

export function dvtSubstraitJoinConditionKey<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>,
  operandKey: (operand: Operand) => string
): string {
  if (isDvtSubstraitJoinConditionGroup(condition)) {
    return `group:${condition.combination ?? 'and'}:[${condition.conditions
      .map((child) => dvtSubstraitJoinConditionKey(child, operandKey))
      .join(',')}]`;
  }
  return `${condition.combination ?? 'and'}:${condition.operator ?? 'equal'}:${dvtSubstraitJoinConditionOperands(
    condition
  )
    .map(operandKey)
    .join(':')}`;
}

function withoutCombination<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>
): DvtSubstraitJoinCondition<Operand> {
  const { combination: _combination, ...rest } = condition;
  return rest as DvtSubstraitJoinCondition<Operand>;
}

export function appendDvtSubstraitJoinComparison<Operand>(args: {
  conditions: readonly DvtSubstraitJoinCondition<Operand>[];
  condition: DvtSubstraitJoinComparisonCondition<Operand>;
  groupWithPrevious?: boolean;
}): readonly DvtSubstraitJoinCondition<Operand>[] | null {
  if (!args.groupWithPrevious) return [...args.conditions, args.condition];
  const previous = args.conditions.at(-1);
  if (previous == null) return null;
  const prefix = args.conditions.slice(0, -1);
  const nested = {
    ...args.condition,
    combination: args.condition.combination ?? 'and',
  } satisfies DvtSubstraitJoinComparisonCondition<Operand>;
  if (isDvtSubstraitJoinConditionGroup(previous)) {
    return [...prefix, { ...previous, conditions: [...previous.conditions, nested] }];
  }
  return [
    ...prefix,
    {
      kind: 'group',
      combination: previous.combination ?? 'and',
      conditions: [withoutCombination(previous), nested],
    },
  ];
}

function countMatchingComparisons<Operand>(args: {
  conditions: readonly DvtSubstraitJoinCondition<Operand>[];
  conditionKey: string;
  operandKey: (operand: Operand) => string;
}): number {
  return args.conditions
    .flatMap(collectDvtSubstraitJoinConditionComparisons)
    .filter(
      (condition) => dvtSubstraitJoinConditionKey(condition, args.operandKey) === args.conditionKey
    ).length;
}

export function updateDvtSubstraitJoinComparison<Operand>(args: {
  conditions: readonly DvtSubstraitJoinCondition<Operand>[];
  conditionKey: string;
  condition: DvtSubstraitJoinComparisonCondition<Operand>;
  operandKey: (operand: Operand) => string;
}): readonly DvtSubstraitJoinCondition<Operand>[] | null {
  if (countMatchingComparisons(args) !== 1) return null;
  const update = (
    current: DvtSubstraitJoinCondition<Operand>
  ): DvtSubstraitJoinCondition<Operand> => {
    if (isDvtSubstraitJoinConditionGroup(current)) {
      return { ...current, conditions: current.conditions.map(update) };
    }
    return dvtSubstraitJoinConditionKey(current, args.operandKey) === args.conditionKey
      ? args.condition
      : current;
  };
  return args.conditions.map(update);
}

function withCombination<Operand>(
  condition: DvtSubstraitJoinCondition<Operand>,
  combination: DvtSubstraitJoinConditionCombination | undefined
): DvtSubstraitJoinCondition<Operand> {
  return { ...condition, combination };
}

export function removeDvtSubstraitJoinComparison<Operand>(args: {
  conditions: readonly DvtSubstraitJoinCondition<Operand>[];
  conditionKey: string;
  operandKey: (operand: Operand) => string;
}): readonly DvtSubstraitJoinCondition<Operand>[] | null {
  if (countMatchingComparisons(args) !== 1) return null;
  const remove = (
    current: DvtSubstraitJoinCondition<Operand>
  ): DvtSubstraitJoinCondition<Operand> | null => {
    if (!isDvtSubstraitJoinConditionGroup(current)) {
      return dvtSubstraitJoinConditionKey(current, args.operandKey) === args.conditionKey
        ? null
        : current;
    }
    const conditions = current.conditions.flatMap((condition) => {
      const next = remove(condition);
      return next == null ? [] : [next];
    });
    if (conditions.length === 0) return null;
    if (conditions.length === 1) {
      return withCombination(conditions[0]!, current.combination);
    }
    return { ...current, conditions };
  };
  return args.conditions.flatMap((condition) => {
    const next = remove(condition);
    return next == null ? [] : [next];
  });
}
