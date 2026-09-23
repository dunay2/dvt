/** Owns physical Read bindings and source compatibility, independent of their relational consumer. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { DvtSubstraitRelationBindingV1Schema } from '@dvt/contracts';

import { hasConsistentJoinPhysicalSources } from './join-inspection/physicalSources.js';
import {
  hasSameConnectionRef,
  joinFieldType,
  namedTableIdentity,
} from './substraitJoinInspectionGuards.js';
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitNInputJoinProjection,
} from './substraitJoinReadModel.js';

export function inspectReadInputs(
  draft: DvtSubstraitJoinDraft,
  reads: readonly Rel[]
): DvtSubstraitNInputJoinProjection['inputs'] | null {
  const { sidecar } = draft;
  const inputs: DvtSubstraitNInputJoinProjection['inputs'][number][] = [];
  for (const readRel of reads) {
    if (readRel.relType.case !== 'read' || readRel.relType.value.common?.relAnchor == null) {
      return null;
    }
    const table = namedTableIdentity(readRel);
    const fieldNames = readRel.relType.value.baseSchema?.names;
    const fieldTypes = readRel.relType.value.baseSchema?.struct?.types;
    const inspectedFieldTypes = fieldTypes?.map(joinFieldType);
    const anchor = readRel.relType.value.common.relAnchor;
    const binding = sidecar.relations.find((relation) => relation.relAnchor === anchor);
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
      !DvtSubstraitRelationBindingV1Schema.safeParse(binding).success
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
    inputs.some(
      (input) =>
        input.sourceRef.connectionRef.provider !== 'postgres' ||
        !hasSameConnectionRef(inputs[0]!.sourceRef.connectionRef, input.sourceRef.connectionRef)
    ) ||
    !hasConsistentJoinPhysicalSources(inputs)
  ) {
    return null;
  }

  return inputs;
}
