/** Owns fail-closed inspection of admitted base SetRel documents. */
import {
  SetRel_SetOp,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import {
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasSameConnectionRef,
  hasUniqueJoinSidecarIdentity,
  joinFieldType,
  namedTableIdentity,
} from './substraitJoinInspectionGuards.js';
import type {
  DvtSubstraitSetDraft,
  DvtSubstraitSetInspection,
  DvtSubstraitSetOperation,
  DvtSubstraitSetProjection,
} from './substraitSetReadModel.js';

type RelationBinding = DvtSubstraitSetDraft['sidecar']['relations'][number];

function operationFor(op: SetRel_SetOp): DvtSubstraitSetOperation | null {
  if (op === SetRel_SetOp.UNION_ALL) return 'union_all';
  if (op === SetRel_SetOp.UNION_DISTINCT) return 'union_distinct';
  return null;
}

function tableFields(rel: Rel): Readonly<{
  schema: string;
  table: string;
  relAnchor: number;
  fields: readonly Readonly<{ name: string; dataType: string; nullable: boolean }>[];
}> | null {
  const table = namedTableIdentity(rel);
  if (table == null || rel.relType.case !== 'read') return null;
  const read = rel.relType.value;
  const names = read.baseSchema?.names ?? [];
  const types = read.baseSchema?.struct?.types ?? [];
  const relAnchor = read.common?.relAnchor;
  if (
    relAnchor == null ||
    names.length === 0 ||
    names.length !== types.length ||
    new Set(names).size !== names.length ||
    names.some((name) => name.length === 0 || name !== name.trim())
  ) {
    return null;
  }
  const fields = names.map((name, index) => {
    const fieldType = types[index] == null ? null : joinFieldType(types[index]);
    return fieldType == null ? null : { name, ...fieldType };
  });
  return fields.some((field) => field == null)
    ? null
    : {
        ...table,
        relAnchor,
        fields: fields.filter((field) => field != null),
      };
}

function sortedFields(sidecar: DvtSubstraitSetDraft['sidecar'], relationId: string) {
  return sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

function sameSource(first: RelationBinding, second: RelationBinding): boolean {
  return (
    first.sourceRef != null &&
    second.sourceRef != null &&
    first.sourceRef.schemaVersion === second.sourceRef.schemaVersion &&
    first.sourceRef.sourceObjectId === second.sourceRef.sourceObjectId &&
    hasSameConnectionRef(first.sourceRef.connectionRef, second.sourceRef.connectionRef)
  );
}

export function inspectDvtSubstraitSetDraft(
  draft: DvtSubstraitSetDraft
): DvtSubstraitSetInspection {
  const { plan, sidecar } = draft;
  const root = plan.relations[0]?.relType;
  const rootValue = root?.case === 'root' ? root.value : null;
  const rel = rootValue?.input?.relType;
  if (
    !hasPinnedPlanVersion(plan) ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft) ||
    plan.relations.length !== 1 ||
    plan.extensionUrns.length !== 0 ||
    plan.extensions.length !== 0 ||
    rootValue == null ||
    rel?.case !== 'set'
  ) {
    return { ok: false };
  }
  const set = rel.value;
  const operation = operationFor(set.op);
  const inputCount = set.inputs.length;
  const resultRelAnchor = inputCount + 1;
  if (
    operation == null ||
    inputCount < 2 ||
    set.advancedExtension != null ||
    set.common?.relAnchor !== resultRelAnchor ||
    set.common.hint != null ||
    set.common.advancedExtension != null ||
    set.common.emitKind.case !== 'emit' ||
    sidecar.relations.length !== resultRelAnchor
  ) {
    return { ok: false };
  }

  const tables = set.inputs.map(tableFields);
  const firstTable = tables[0];
  if (
    firstTable == null ||
    tables.some(
      (table, index) =>
        table == null ||
        table.relAnchor !== index + 1 ||
        JSON.stringify(table.fields) !== JSON.stringify(firstTable.fields)
    )
  ) {
    return { ok: false };
  }
  const sourceBindings = Array.from({ length: inputCount }, (_, index) =>
    sidecar.relations.find((binding) => binding.relAnchor === index + 1)
  );
  const resultBinding = sidecar.relations.find((binding) => binding.relAnchor === resultRelAnchor);
  const firstBinding = sourceBindings[0];
  if (
    firstBinding == null ||
    firstBinding.sourceRef == null ||
    firstBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    resultBinding == null ||
    resultBinding.sourceRef != null ||
    sourceBindings.some(
      (binding, index) =>
        binding == null ||
        binding.sourceRef == null ||
        binding.sourceRef.connectionRef.provider !== 'postgres' ||
        !hasSameConnectionRef(
          firstBinding.sourceRef!.connectionRef,
          binding.sourceRef.connectionRef
        ) ||
        binding.displayName !== tables[index]?.table ||
        sourceBindings.some(
          (candidate, candidateIndex) =>
            candidate != null && candidateIndex !== index && sameSource(binding, candidate)
        )
    ) ||
    resultBinding.displayName !== tables.map((table) => table!.table).join('+')
  ) {
    return { ok: false };
  }

  const inputs: DvtSubstraitSetProjection['inputs'][number][] = [];
  for (const [index, binding] of sourceBindings.entries()) {
    const table = tables[index];
    if (binding?.sourceRef == null || table == null) return { ok: false };
    const fields = sortedFields(sidecar, binding.relationId);
    if (
      fields.length !== table.fields.length ||
      fields.some(
        (field, ordinal) =>
          field.outputOrdinal !== ordinal ||
          field.displayName !== table.fields[ordinal]?.name ||
          field.parentFieldId != null
      )
    ) {
      return { ok: false };
    }
    inputs.push({
      relationId: binding.relationId,
      schema: table.schema,
      table: table.table,
      sourceRef: binding.sourceRef,
      fields: fields.map((field, ordinal) => ({
        name: table.fields[ordinal]!.name,
        fieldId: field.fieldId,
        dataType: table.fields[ordinal]!.dataType,
        nullable: table.fields[ordinal]!.nullable,
      })),
    });
  }

  const names = rootValue.names;
  const outputMapping = set.common.emitKind.value.outputMapping;
  const resultFields = sortedFields(sidecar, resultBinding.relationId);
  if (
    names.length === 0 ||
    names.length !== outputMapping.length ||
    names.length !== resultFields.length ||
    new Set(names).size !== names.length ||
    new Set(outputMapping).size !== outputMapping.length ||
    names.some((name) => name.length === 0 || name !== name.trim()) ||
    outputMapping.some(
      (ordinal) => !Number.isInteger(ordinal) || ordinal < 0 || ordinal >= firstTable.fields.length
    ) ||
    sidecar.fields.length !== firstTable.fields.length * inputCount + resultFields.length
  ) {
    return { ok: false };
  }
  const outputs = outputMapping.map((inputOrdinal, outputOrdinal) => {
    const inputField = firstTable.fields[inputOrdinal];
    const field = resultFields[outputOrdinal];
    const name = names[outputOrdinal];
    return inputField == null ||
      field == null ||
      name == null ||
      field.outputOrdinal !== outputOrdinal ||
      field.displayName !== name ||
      field.parentFieldId != null
      ? null
      : {
          fieldKey: inputField.name,
          name,
          fieldId: field.fieldId,
          outputOrdinal,
          dataType: inputField.dataType,
          nullable: inputs.some((input) => input.fields[inputOrdinal]?.nullable ?? true),
        };
  });
  if (outputs.some((output) => output == null)) return { ok: false };
  return {
    ok: true,
    projection: {
      operation,
      inputs,
      resultRelationId: resultBinding.relationId,
      outputs: outputs.filter((output) => output != null),
    },
  };
}
