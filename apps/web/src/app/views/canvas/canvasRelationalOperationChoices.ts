/** Owned concern: project admitted relational-operation choices from current input facts. */
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { hasCompatibleCanvasDvtJoinFields } from './canvasDvtJoinTypeAdmission';

export type CanvasRelationalOperation = 'inner_join' | 'union_all';

export type CanvasRelationalOperationAvailability =
  | 'available'
  | 'needs-predicate'
  | 'needs-schema-alignment'
  | 'semantically-unavailable'
  | 'target-unavailable'
  | 'read-only';

export type CanvasRelationalOperationChoice = Readonly<{
  operation: CanvasRelationalOperation;
  availability: CanvasRelationalOperationAvailability;
  selectable: boolean;
}>;

function isAdmitted(message: string, selector: string): boolean {
  const entryId = buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message,
    selector,
  });
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.kind === 'standard' &&
      entry.entryId === entryId &&
      entry.profileStatus === 'supported-profile'
  );
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

function hasCompatibleJoinTypePair(inputs: readonly CanvasDvtCompositionInput[]): boolean {
  return inputs.some((left, index) =>
    inputs
      .slice(index + 1)
      .some((right) => hasCompatibleCanvasDvtJoinFields(left.fields, right.fields))
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
  }>
): readonly CanvasRelationalOperationChoice[] {
  const readOnlyAvailability = args.readOnly ? 'read-only' : null;
  const unionAllTargetSupported = targetSupports(args.inputs);
  const innerJoinAdmitted = isAdmitted('substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER');
  const unionAllAdmitted = isAdmitted('substrait.SetRel', 'SetOp.SET_OP_UNION_ALL');
  const innerJoinAvailability =
    readOnlyAvailability ??
    (!innerJoinAdmitted
      ? 'semantically-unavailable'
      : !hasCompatibleJoinTypePair(args.inputs)
        ? 'semantically-unavailable'
        : !hasCompatibleJoinPair(args.inputs)
          ? 'target-unavailable'
          : args.predicateAvailable
            ? 'available'
            : 'needs-predicate');
  const unionAllAvailability =
    readOnlyAvailability ??
    (!unionAllAdmitted
      ? 'semantically-unavailable'
      : !unionAllTargetSupported
        ? 'target-unavailable'
        : args.unionAllAvailable
          ? 'available'
          : 'needs-schema-alignment');

  return [
    {
      operation: 'inner_join',
      availability: innerJoinAvailability,
      selectable:
        innerJoinAvailability === 'available' || innerJoinAvailability === 'needs-predicate',
    },
    {
      operation: 'union_all',
      availability: unionAllAvailability,
      selectable: unionAllAvailability === 'available',
    },
  ];
}
