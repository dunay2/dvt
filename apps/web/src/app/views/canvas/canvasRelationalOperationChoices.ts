/** Project operation choices from typed operand facts and the canonical capability catalog. */
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

const operations = {
  inner_join: ['join', 'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_INNER'],
  left_join: ['join', 'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_LEFT'],
  right_join: ['join', 'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_RIGHT'],
  full_outer_join: ['join', 'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_OUTER'],
  left_semi_join: [
    'join',
    'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_LEFT_SEMI',
  ],
  left_anti_join: [
    'join',
    'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_LEFT_ANTI',
  ],
  right_semi_join: [
    'join',
    'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_RIGHT_SEMI',
  ],
  right_anti_join: [
    'join',
    'substrait/core/relation/substrait.JoinRel/JoinType.JOIN_TYPE_RIGHT_ANTI',
  ],
  cross_join: ['cross', 'substrait/core/relation/substrait.CrossRel'],
  union_all: ['set', 'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_UNION_ALL'],
  union_distinct: ['set', 'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_UNION_DISTINCT'],
  intersect_distinct: [
    'set',
    'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_INTERSECTION_MULTISET',
  ],
  except_distinct: ['set', 'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_MINUS_PRIMARY'],
  intersect_all: [
    'set',
    'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_INTERSECTION_MULTISET_ALL',
  ],
  except_all: ['set', 'substrait/core/relation/substrait.SetRel/SetOp.SET_OP_MINUS_PRIMARY_ALL'],
} as const;

export type CanvasRelationalOperation = keyof typeof operations | 'projection';
export type CanvasCompositionOperation = Exclude<CanvasRelationalOperation, 'projection'>;
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

export function isCanvasCompositionOperation(
  operation: string | null | undefined
): operation is CanvasCompositionOperation {
  return operation != null && Object.hasOwn(operations, operation);
}

export function isCanvasSetOperation(
  operation: string | null | undefined
): operation is CanvasSetOperation {
  return (
    operation != null &&
    Object.hasOwn(operations, operation) &&
    operations[operation as keyof typeof operations][0] === 'set'
  );
}

function capabilityAvailability(
  capabilityId: string
): 'available' | 'semantically-unavailable' | 'target-unavailable' {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === capabilityId
  );
  if (
    entry?.kind !== 'standard' ||
    entry.profileStatus !== 'supported-profile' ||
    entry.admission?.visualExposure?.status !== 'exposed'
  )
    return 'semantically-unavailable';
  const target = entry.admission.targetConformance?.find(({ targetId }) => targetId === 'postgres');
  // Mapping permits authoring; it does not assert provider acceptance or runtime readiness.
  return target?.status === 'mapped' || target?.status === 'provider-accepted'
    ? 'available'
    : 'target-unavailable';
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
  ).map(([operation, [family, capabilityId]]) => {
    const capability = capabilityAvailability(capabilityId);
    const availability: CanvasRelationalOperationAvailability = facts.readOnly
      ? 'read-only'
      : capability !== 'available'
        ? capability
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
    : capabilityAvailability('substrait/core/relation/substrait.ProjectRel');
  return { operation: 'projection', availability, selectable: availability === 'available' };
}

export function resolveCanvasRelationalStagedOperationChoices(
  readOnly: boolean
): readonly CanvasRelationalOperationChoice[] {
  return resolveCanvasRelationalOperationChoices({
    readOnly,
    inputCount: 0,
    sameConnection: true,
    completeSchema: true,
    comparableFields: true,
    predicateAvailable: false,
    sets: {},
  });
}
