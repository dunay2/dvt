/**
 * Owned concern: define input cardinality shared by persisted authoring and connection admission.
 * @baseline ADR-0064: Substrait owns semantics; the authoring contract bounds admitted ports.
 * @decision Reuse unary, binary and repeated-input policies in one named operation mapping.
 * @consequence UNION grows without widening fixed-arity operators or duplicating UI rules.
 * @version 1.0.0
 */
const unary = { minimum: 1, maximum: 1 } as const;
const binary = { minimum: 2, maximum: 2 } as const;
const variadic = { minimum: 2, maximum: null } as const;

export const DVT_RELATIONAL_OPERATION_INPUTS = {
  projection: unary,
  field_transform: unary,
  filter: unary,
  aggregate: unary,
  window: unary,
  sort: unary,
  fetch: unary,
  inner_join: binary,
  left_join: binary,
  right_join: binary,
  full_outer_join: binary,
  left_semi_join: binary,
  left_anti_join: binary,
  right_semi_join: binary,
  right_anti_join: binary,
  cross_join: binary,
  union_all: variadic,
  union_distinct: variadic,
  intersect_distinct: binary,
  except_distinct: binary,
  intersect_all: binary,
  except_all: binary,
} as const;

export type DvtRelationalOperationKind = keyof typeof DVT_RELATIONAL_OPERATION_INPUTS;

export function acceptsDvtRelationalOperationInputCount(
  operation: DvtRelationalOperationKind,
  count: number
): boolean {
  const { minimum, maximum } = DVT_RELATIONAL_OPERATION_INPUTS[operation];
  return Number.isInteger(count) && count >= minimum && (maximum == null || count <= maximum);
}
