/** Preserve nested structure and lineage while allocating a new relation's output identities. */
import { allocateDvtFieldId, type DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

export function createRelationPassthroughFields(
  relationId: string,
  inputs: readonly DvtSubstraitFieldBindingV1[]
): readonly DvtSubstraitFieldBindingV1[] {
  const ids = new Map(inputs.map((field) => [field.fieldId, allocateDvtFieldId()]));
  return inputs.map((source) => ({
    fieldId: ids.get(source.fieldId)!,
    relationId,
    outputOrdinal: source.outputOrdinal,
    displayName: source.displayName,
    sourceFieldId: source.fieldId,
    ...(source.description == null ? {} : { description: source.description }),
    ...(source.parentFieldId == null ? {} : { parentFieldId: ids.get(source.parentFieldId)! }),
  }));
}
