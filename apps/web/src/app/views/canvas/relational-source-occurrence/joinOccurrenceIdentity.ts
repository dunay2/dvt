/** Owned concern: bind JOIN Read occurrences by identity, never by physical source shape. */
import { allocateDvtFieldId, allocateDvtRelationId, type ConnectedSourceRef } from '@dvt/contracts';
import {
  type DvtSubstraitJoinDataType,
  type InspectedJoinStructure,
} from '@dvt/postgres-projection';
import { hasSameConnectedSourceRef } from '../canvasDvtSubstraitJoinSourceResolution';

type ReadField = Readonly<{ name: string; dataType: DvtSubstraitJoinDataType; nullable: boolean }>;
type ReadOccurrence = Readonly<{
  relationId?: string;
  source: Readonly<{ schema: string; table: string; sourceRef: ConnectedSourceRef }>;
  fields: readonly ReadField[];
}>;

function sameFields(left: readonly ReadField[], right: readonly ReadField[]): boolean {
  return (
    left.length === right.length &&
    left.every((field, index) => {
      const other = right[index];
      return (
        other != null &&
        field.name === other.name &&
        field.dataType === other.dataType &&
        field.nullable === other.nullable
      );
    })
  );
}

export function resolveCanvasDvtJoinOccurrenceIdentities(
  inputs: readonly ReadOccurrence[],
  previous: InspectedJoinStructure | null
) {
  const seen = new Set<string>();
  return inputs.map((input, index) => {
    const physical = inputs
      .slice(0, index)
      .find((candidate) =>
        hasSameConnectedSourceRef(candidate.source.sourceRef, input.source.sourceRef)
      );
    if (
      physical != null &&
      (physical.source.schema !== input.source.schema ||
        physical.source.table !== input.source.table ||
        !sameFields(physical.fields, input.fields))
    ) {
      throw new Error('Repeated JOIN sources must have consistent physical provenance.');
    }
    const prior =
      input.relationId == null
        ? undefined
        : previous?.inputs.find((candidate) => candidate.relationId === input.relationId);
    if (
      input.relationId != null &&
      (prior == null ||
        prior.schema !== input.source.schema ||
        prior.table !== input.source.table ||
        !hasSameConnectedSourceRef(prior.sourceRef, input.source.sourceRef) ||
        !sameFields(prior.fields, input.fields))
    ) {
      throw new Error('JOIN occurrence identity must reference its unchanged canonical Read.');
    }
    const relationId = prior?.relationId ?? allocateDvtRelationId();
    if (seen.has(relationId)) throw new Error('JOIN occurrence identities must be unique.');
    seen.add(relationId);
    return {
      relationId,
      fields: input.fields.map((field, ordinal) => ({
        ...field,
        fieldId: prior?.fields[ordinal]!.fieldId ?? allocateDvtFieldId(),
      })),
    };
  });
}
