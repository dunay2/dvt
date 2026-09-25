/** Project operation choices from typed operand facts and the canonical capability catalog. */
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';

const operations = {
  inner_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'],
  left_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT'],
  right_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT'],
  full_outer_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_OUTER'],
  left_semi_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_SEMI'],
  left_anti_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_ANTI'],
  right_semi_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_SEMI'],
  right_anti_join: ['join', 'substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_ANTI'],
  cross_join: ['cross', 'substrait.CrossRel', undefined],
  union_all: ['set', 'substrait.SetRel', 'SetOp.SET_OP_UNION_ALL'],
  union_distinct: ['set', 'substrait.SetRel', 'SetOp.SET_OP_UNION_DISTINCT'],
  intersect_distinct: ['set', 'substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET'],
  except_distinct: ['set', 'substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY'],
  intersect_all: ['set', 'substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET_ALL'],
  except_all: ['set', 'substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY_ALL'],
} as const;

export type CanvasRelationalOperation = keyof typeof operations | 'projection';
export type CanvasSetOperation = {
  [K in keyof typeof operations]: (typeof operations)[K][0] extends 'set' ? K : never;
}[keyof typeof operations];
export type CanvasRelationalOperationAvailability =
  | 'available'
  | 'needs-predicate'
  | 'needs-input'
  | 'needs-schema-alignment'
  | 'semantically-unavailable'
  | 'target-unavailable'
  | 'read-only';
export type CanvasRelationalOperationChoice = Readonly<{
  operation: CanvasRelationalOperation;
  availability: CanvasRelationalOperationAvailability;
  selectable: boolean;
}>;
export type CanvasOperationFacts = Readonly<{
  readOnly: boolean;
  inputCount: number;
  sameConnection: boolean;
  completeSchema: boolean;
  comparableFields: boolean;
  predicateAvailable: boolean;
  sets: Readonly<Partial<Record<CanvasSetOperation, boolean>>>;
}>;

export function isCanvasSetOperation(
  operation: string | null | undefined
): operation is CanvasSetOperation {
  return (
    operation != null &&
    Object.hasOwn(operations, operation) &&
    operations[operation as keyof typeof operations][0] === 'set'
  );
}

function isAdmitted(message: string, selector?: string): boolean {
  const id = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message,
    ...(selector == null ? {} : { selector }),
  });
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === id &&
      entry.profileStatus === 'supported-profile'
  );
}

const availabilityFor = {
  join: (facts: CanvasOperationFacts): CanvasRelationalOperationAvailability =>
    !facts.comparableFields
      ? 'semantically-unavailable'
      : facts.predicateAvailable
        ? 'available'
        : 'needs-predicate',
  cross: (): CanvasRelationalOperationAvailability => 'available',
  set: (
    facts: CanvasOperationFacts,
    operation: CanvasSetOperation
  ): CanvasRelationalOperationAvailability =>
    facts.sets[operation] === true ? 'available' : 'needs-schema-alignment',
};

export function resolveCanvasRelationalOperationChoices(
  facts: CanvasOperationFacts
): readonly CanvasRelationalOperationChoice[] {
  return (
    Object.entries(operations) as [
      keyof typeof operations,
      (typeof operations)[keyof typeof operations],
    ][]
  ).map(([operation, [family, message, selector]]) => {
    const availability: CanvasRelationalOperationAvailability = facts.readOnly
      ? 'read-only'
      : !isAdmitted(message, selector)
        ? 'semantically-unavailable'
        : facts.inputCount < 2
          ? 'needs-input'
          : !facts.sameConnection
            ? 'target-unavailable'
            : !facts.completeSchema
              ? 'semantically-unavailable'
              : family === 'set'
                ? availabilityFor.set(facts, operation as CanvasSetOperation)
                : availabilityFor[family](facts);
    return {
      operation,
      availability,
      selectable: availability === 'available' || availability === 'needs-predicate',
    };
  });
}

export function resolveCanvasRelationalProjectionChoice(
  readOnly: boolean
): CanvasRelationalOperationChoice {
  const availability = readOnly
    ? 'read-only'
    : isAdmitted('substrait.ProjectRel')
      ? 'available'
      : 'semantically-unavailable';
  return { operation: 'projection', availability, selectable: availability === 'available' };
}
