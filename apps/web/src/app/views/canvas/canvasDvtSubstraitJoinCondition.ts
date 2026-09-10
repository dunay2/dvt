/** Owned concern: represent and traverse recursive boolean JOIN conditions. */
import type {
  DvtSubstraitJoinOperand,
  DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';

type JoinFieldOperand = Readonly<{ kind: 'field' }>;

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

export const DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS = ['and', 'or'] as const;
export type DvtSubstraitJoinConditionCombination =
  (typeof DVT_SUBSTRAIT_JOIN_CONDITION_COMBINATIONS)[number];

export type DvtSubstraitJoinComparisonCondition<Operand> = Readonly<{
  kind?: 'comparison';
  left: Operand;
  right: Operand;
  operator?: DvtSubstraitJoinComparisonOperator;
  combination?: DvtSubstraitJoinConditionCombination;
}>;

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
  return `${condition.combination ?? 'and'}:${condition.operator ?? 'equal'}:${operandKey(
    condition.left
  )}:${operandKey(condition.right)}`;
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

export function reduceDvtSubstraitJoinConditions<Operand, Result>(args: {
  initial: Result;
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
      throw new Error('VTX2 INNER JOIN condition groups require at least two conditions.');
    }
    return rest.reduce(
      (left, child) => args.combine(child.combination ?? 'and', left, term(child)),
      term(first)
    );
  };
  return args.conditions.reduce(
    (left, condition) => args.combine(condition.combination ?? 'and', left, term(condition)),
    args.initial
  );
}
