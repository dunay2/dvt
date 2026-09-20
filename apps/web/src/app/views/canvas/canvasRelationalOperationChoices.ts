/** Owned concern: project admitted relational-operation choices from current input facts. */
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { hasCompatibleCanvasDvtJoinFields } from './canvasDvtJoinTypeAdmission';

export type CanvasRelationalOperation =
  | 'projection'
  | 'inner_join'
  | 'left_join'
  | 'right_join'
  | 'full_outer_join'
  | 'left_semi_join'
  | 'left_anti_join'
  | 'right_semi_join'
  | 'right_anti_join'
  | 'cross_join'
  | 'union_all'
  | 'union_distinct'
  | 'intersect_distinct'
  | 'except_distinct';

export function isCanvasSetOperation(
  operation: string | null | undefined
): operation is 'union_all' | 'union_distinct' | 'intersect_distinct' | 'except_distinct' {
  return (
    operation === 'union_all' ||
    operation === 'union_distinct' ||
    operation === 'intersect_distinct' ||
    operation === 'except_distinct'
  );
}

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

function isAdmitted(message: string, selector?: string): boolean {
  const entryId = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message,
    ...(selector == null ? {} : { selector }),
  });
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === entryId &&
      entry.profileStatus === 'supported-profile'
  );
}

export function resolveCanvasRelationalProjectionChoice(
  readOnly: boolean
): CanvasRelationalOperationChoice {
  const entryId = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message: 'substrait.ProjectRel',
  });
  const admitted = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === entryId &&
      entry.profileStatus === 'supported-profile'
  );
  const availability = readOnly ? 'read-only' : admitted ? 'available' : 'semantically-unavailable';
  return { operation: 'projection', availability, selectable: availability === 'available' };
}

function hasCompatibleJoinPair(inputs: readonly CanvasDvtCompositionInput[]): boolean {
  return inputs.some((left, index) =>
    inputs
      .slice(index + 1)
      .some(
        (right) =>
          left.sourceRef.connectionRef.provider === 'postgres' &&
          right.sourceRef.connectionRef.provider === 'postgres' &&
          hasSameConnectionRef(left.sourceRef.connectionRef, right.sourceRef.connectionRef) &&
          hasCompatibleCanvasDvtJoinFields(left.fields, right.fields)
      )
  );
}

function targetSupports(inputs: readonly CanvasDvtCompositionInput[]): boolean {
  const first = inputs[0]?.sourceRef.connectionRef;
  return (
    first != null &&
    first.provider === 'postgres' &&
    inputs.every(
      (input) =>
        input.sourceRef.connectionRef.provider === 'postgres' &&
        hasSameConnectionRef(first, input.sourceRef.connectionRef)
    )
  );
}

export function resolveCanvasRelationalOperationChoices(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    predicateAvailable: boolean;
    readOnly: boolean;
    unionAllAvailable: boolean;
    unionDistinctAvailable?: boolean;
    intersectDistinctAvailable?: boolean;
    exceptDistinctAvailable?: boolean;
  }>
): readonly CanvasRelationalOperationChoice[] {
  const readOnlyAvailability = args.readOnly ? 'read-only' : null;
  const unionAllTargetSupported = targetSupports(args.inputs);
  const innerJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER');
  const leftJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT');
  const rightJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT');
  const fullOuterJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_OUTER');
  const leftSemiJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_SEMI');
  const leftAntiJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT_ANTI');
  const rightSemiJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_SEMI');
  const rightAntiJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_RIGHT_ANTI');
  const crossJoinAdmitted = isAdmitted('substrait.CrossRel');
  const unionAllAdmitted = isAdmitted('substrait.SetRel', 'SetOp.SET_OP_UNION_ALL');
  const unionDistinctAdmitted = isAdmitted('substrait.SetRel', 'SetOp.SET_OP_UNION_DISTINCT');
  const intersectDistinctAdmitted = isAdmitted(
    'substrait.SetRel',
    'SetOp.SET_OP_INTERSECTION_MULTISET'
  );
  const exceptDistinctAdmitted = isAdmitted('substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY');
  const hasCompatibleJoinTypePair = args.inputs.some((left, index) =>
    args.inputs
      .slice(index + 1)
      .some((right) => hasCompatibleCanvasDvtJoinFields(left.fields, right.fields))
  );
  const joinAvailability = (admitted: boolean): CanvasRelationalOperationAvailability =>
    readOnlyAvailability ??
    (!admitted
      ? 'semantically-unavailable'
      : !hasCompatibleJoinTypePair
        ? 'semantically-unavailable'
        : !hasCompatibleJoinPair(args.inputs)
          ? 'target-unavailable'
          : args.predicateAvailable
            ? 'available'
            : 'needs-predicate');
  const innerJoinAvailability = joinAvailability(innerJoinAdmitted);
  const leftJoinAvailability = joinAvailability(leftJoinAdmitted);
  const rightJoinAvailability = joinAvailability(rightJoinAdmitted);
  const fullOuterJoinAvailability = joinAvailability(fullOuterJoinAdmitted);
  const leftSemiJoinAvailability = joinAvailability(leftSemiJoinAdmitted);
  const leftAntiJoinAvailability = joinAvailability(leftAntiJoinAdmitted);
  const rightSemiJoinAvailability = joinAvailability(rightSemiJoinAdmitted);
  const rightAntiJoinAvailability = joinAvailability(rightAntiJoinAdmitted);
  const crossJoinAvailability =
    readOnlyAvailability ??
    (!crossJoinAdmitted
      ? 'semantically-unavailable'
      : !args.inputs.every((input) => input.fields.every((field) => field.joinDataType != null))
        ? 'semantically-unavailable'
        : !targetSupports(args.inputs)
          ? 'target-unavailable'
          : args.inputs.length < 2
            ? 'needs-input'
            : 'available');
  const unionAllAvailability =
    readOnlyAvailability ??
    (!unionAllAdmitted
      ? 'semantically-unavailable'
      : !unionAllTargetSupported
        ? 'target-unavailable'
        : args.unionAllAvailable
          ? 'available'
          : 'needs-schema-alignment');
  const unionDistinctAvailable = args.unionDistinctAvailable ?? args.unionAllAvailable;
  const unionDistinctAvailability =
    readOnlyAvailability ??
    (!unionDistinctAdmitted
      ? 'semantically-unavailable'
      : !unionAllTargetSupported
        ? 'target-unavailable'
        : unionDistinctAvailable
          ? 'available'
          : 'needs-schema-alignment');
  const setDistinctAvailability = (
    admitted: boolean,
    available: boolean | undefined
  ): CanvasRelationalOperationAvailability =>
    readOnlyAvailability ??
    (!admitted
      ? 'semantically-unavailable'
      : !unionAllTargetSupported
        ? 'target-unavailable'
        : (available ?? args.unionAllAvailable)
          ? 'available'
          : 'needs-schema-alignment');
  const intersectDistinctAvailability = setDistinctAvailability(
    intersectDistinctAdmitted,
    args.intersectDistinctAvailable
  );
  const exceptDistinctAvailability = setDistinctAvailability(
    exceptDistinctAdmitted,
    args.exceptDistinctAvailable
  );

  return [
    {
      operation: 'inner_join',
      availability: innerJoinAvailability,
      selectable:
        innerJoinAvailability === 'available' || innerJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'left_join',
      availability: leftJoinAvailability,
      selectable:
        leftJoinAvailability === 'available' || leftJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'right_join',
      availability: rightJoinAvailability,
      selectable:
        rightJoinAvailability === 'available' || rightJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'full_outer_join',
      availability: fullOuterJoinAvailability,
      selectable:
        fullOuterJoinAvailability === 'available' ||
        fullOuterJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'left_semi_join',
      availability: leftSemiJoinAvailability,
      selectable:
        leftSemiJoinAvailability === 'available' || leftSemiJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'left_anti_join',
      availability: leftAntiJoinAvailability,
      selectable:
        leftAntiJoinAvailability === 'available' || leftAntiJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'right_semi_join',
      availability: rightSemiJoinAvailability,
      selectable:
        rightSemiJoinAvailability === 'available' ||
        rightSemiJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'right_anti_join',
      availability: rightAntiJoinAvailability,
      selectable:
        rightAntiJoinAvailability === 'available' ||
        rightAntiJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'cross_join',
      availability: crossJoinAvailability,
      selectable: crossJoinAvailability === 'available',
    },
    {
      operation: 'union_all',
      availability: unionAllAvailability,
      selectable: unionAllAvailability === 'available',
    },
    {
      operation: 'union_distinct',
      availability: unionDistinctAvailability,
      selectable: unionDistinctAvailability === 'available',
    },
    {
      operation: 'intersect_distinct',
      availability: intersectDistinctAvailability,
      selectable: intersectDistinctAvailability === 'available',
    },
    {
      operation: 'except_distinct',
      availability: exceptDistinctAvailability,
      selectable: exceptDistinctAvailability === 'available',
    },
  ];
}
