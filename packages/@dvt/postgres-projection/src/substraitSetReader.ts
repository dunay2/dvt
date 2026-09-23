/** Owns admission, output mapping and nullability of the bounded SetRel profile. */
import { SetRel_SetOp } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

import {
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import { inspectReadInputs } from './substraitReadInputs.js';
import type {
  DvtSubstraitSetDraft,
  DvtSubstraitSetInspection,
  DvtSubstraitSetOperation,
} from './substraitSetReadModel.js';

const SET_OPERATIONS: Partial<Record<SetRel_SetOp, DvtSubstraitSetOperation>> = {
  [SetRel_SetOp.UNION_ALL]: 'union_all',
  [SetRel_SetOp.UNION_DISTINCT]: 'union_distinct',
  [SetRel_SetOp.INTERSECTION_MULTISET]: 'intersect_distinct',
  [SetRel_SetOp.MINUS_PRIMARY]: 'except_distinct',
  [SetRel_SetOp.INTERSECTION_MULTISET_ALL]: 'intersect_all',
  [SetRel_SetOp.MINUS_PRIMARY_ALL]: 'except_all',
};

function sortedFields(
  sidecar: DvtSubstraitSetDraft['sidecar'],
  relationId: string
): DvtSubstraitSetDraft['sidecar']['fields'] {
  return sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
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
    !indexSubstraitRelations(draft).ok ||
    plan.extensionUrns.length !== 0 ||
    plan.extensions.length !== 0 ||
    rootValue == null ||
    rel?.case !== 'set'
  )
    return { ok: false };

  const set = rel.value;
  const operation = SET_OPERATIONS[set.op];
  const inputCount = set.inputs.length;
  const resultRelAnchor = set.common?.relAnchor;
  if (
    operation == null ||
    inputCount < 2 ||
    set.advancedExtension != null ||
    set.common == null ||
    resultRelAnchor == null ||
    set.common.hint != null ||
    set.common.advancedExtension != null ||
    set.common.emitKind.case !== 'emit' ||
    sidecar.relations.length !== inputCount + 1
  )
    return { ok: false };

  const inputs = inspectReadInputs(draft, set.inputs);
  const firstTable = inputs?.[0];
  const resultBinding = sidecar.relations.find((binding) => binding.relAnchor === resultRelAnchor);
  if (
    inputs == null ||
    firstTable == null ||
    resultBinding == null ||
    resultBinding.sourceRef != null ||
    inputs.some(
      (input) =>
        input.fields.length !== firstTable.fields.length ||
        input.fields.some(
          (field, ordinal) => field.dataType !== firstTable.fields[ordinal]?.dataType
        )
    ) ||
    sidecar.fields.some((field) => field.parentFieldId != null)
  )
    return { ok: false };

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
          nullable:
            operation === 'except_distinct' || operation === 'except_all'
              ? (inputs[0]?.fields[inputOrdinal]?.nullable ?? true)
              : operation === 'intersect_distinct' || operation === 'intersect_all'
                ? inputs.every((input) => input.fields[inputOrdinal]?.nullable ?? true)
                : inputs.some((input) => input.fields[inputOrdinal]?.nullable ?? true),
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
