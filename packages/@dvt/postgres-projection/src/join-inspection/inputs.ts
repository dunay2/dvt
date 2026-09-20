/** Owns physical Read bindings and source compatibility for the admitted JOIN profile. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import {
  hasSameConnectionRef,
  joinFieldType,
  namedTableIdentity,
} from '../substraitJoinInspectionGuards.js';
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitNInputJoinProjection,
} from '../substraitJoinReadModel.js';

export function inspectJoinInputs(
  draft: DvtSubstraitJoinDraft,
  reads: readonly Rel[]
): DvtSubstraitNInputJoinProjection['inputs'] | null {
  const { sidecar } = draft;
  const inputs: DvtSubstraitNInputJoinProjection['inputs'][number][] = [];
  for (const [index, readRel] of reads.entries()) {
    if (readRel.relType.case !== 'read' || readRel.relType.value.common?.relAnchor !== index + 1) {
      return null;
    }
    const table = namedTableIdentity(readRel);
    const fieldNames = readRel.relType.value.baseSchema?.names;
    const fieldTypes = readRel.relType.value.baseSchema?.struct?.types;
    const inspectedFieldTypes = fieldTypes?.map(joinFieldType);
    const binding = sidecar.relations.find((relation) => relation.relAnchor === index + 1);
    if (
      table == null ||
      fieldNames == null ||
      fieldNames.length === 0 ||
      fieldNames.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(fieldNames).size !== fieldNames.length ||
      fieldTypes == null ||
      fieldTypes.length !== fieldNames.length ||
      inspectedFieldTypes == null ||
      inspectedFieldTypes.some((dataType) => dataType == null) ||
      binding == null ||
      binding.sourceRef == null ||
      binding.displayName !== table.table
    ) {
      return null;
    }
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    if (
      fields.length !== fieldNames.length ||
      fields.some(
        (field, fieldIndex) =>
          field.outputOrdinal !== fieldIndex || field.displayName !== fieldNames[fieldIndex]
      )
    ) {
      return null;
    }
    inputs.push({
      relationId: binding.relationId,
      ...table,
      sourceRef: binding.sourceRef,
      fields: fields.map((field, fieldIndex) => ({
        name: fieldNames[fieldIndex]!,
        fieldId: field.fieldId,
        dataType: inspectedFieldTypes[fieldIndex]!.dataType,
        nullable: inspectedFieldTypes[fieldIndex]!.nullable,
      })),
    });
  }
  if (
    new Set(
      inputs.map(
        (input) => `${input.sourceRef.connectionRef.connectionId}:${input.sourceRef.sourceObjectId}`
      )
    ).size !== inputs.length ||
    inputs.some(
      (input) =>
        input.sourceRef.connectionRef.provider !== 'postgres' ||
        !hasSameConnectionRef(inputs[0]!.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  ) {
    return null;
  }

  return inputs;
}
