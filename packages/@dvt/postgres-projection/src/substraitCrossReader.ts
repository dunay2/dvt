/** Owns projection of the exact admitted CrossRel chain to its verified read model. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION } from '@dvt/contracts';

import type {
  DvtSubstraitCrossDraft,
  DvtSubstraitCrossInspection,
  DvtSubstraitCrossProjection,
} from './substraitCrossReadModel.js';
import {
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasSameConnectionRef,
  hasUniqueJoinSidecarIdentity,
  joinFieldType,
  namedTableIdentity,
} from './substraitJoinInspectionGuards.js';
import type { JoinOriginField } from './substraitJoinReadModel.js';

type FlattenedCrossTree = Readonly<{ reads: readonly Rel[]; crosses: readonly Rel[] }>;

export function flattenDvtSubstraitCrossTree(rel: Rel): FlattenedCrossTree | null {
  if (rel.relType.case === 'read') return { reads: [rel], crosses: [] };
  if (rel.relType.case !== 'cross') return null;
  const cross = rel.relType.value;
  if (cross.left == null || cross.right?.relType.case !== 'read') return null;
  const left = flattenDvtSubstraitCrossTree(cross.left);
  return left == null
    ? null
    : { reads: [...left.reads, cross.right], crosses: [...left.crosses, rel] };
}

export function inspectDvtSubstraitCrossDraft(
  draft: DvtSubstraitCrossDraft
): DvtSubstraitCrossInspection {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft)
  ) {
    return { ok: false };
  }
  const root = plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input == null ||
    root.value.names.some((name) => name.length === 0) ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return { ok: false };
  }
  const tree = flattenDvtSubstraitCrossTree(root.value.input);
  if (
    tree == null ||
    tree.reads.length < 2 ||
    tree.crosses.length !== tree.reads.length - 1 ||
    sidecar.relations.length !== tree.reads.length + tree.crosses.length
  ) {
    return { ok: false };
  }

  const inputs: DvtSubstraitCrossProjection['inputs'][number][] = [];
  for (const [index, readRel] of tree.reads.entries()) {
    if (readRel.relType.case !== 'read' || readRel.relType.value.common?.relAnchor !== index + 1) {
      return { ok: false };
    }
    const table = namedTableIdentity(readRel);
    const names = readRel.relType.value.baseSchema?.names;
    const types = readRel.relType.value.baseSchema?.struct?.types;
    const inspectedTypes = types?.map(joinFieldType);
    const binding = sidecar.relations.find((relation) => relation.relAnchor === index + 1);
    if (
      table == null ||
      names == null ||
      names.length === 0 ||
      names.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(names).size !== names.length ||
      types == null ||
      types.length !== names.length ||
      inspectedTypes == null ||
      inspectedTypes.some((type) => type == null) ||
      binding?.sourceRef == null ||
      binding.displayName !== table.table
    ) {
      return { ok: false };
    }
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    if (
      fields.length !== names.length ||
      fields.some(
        (field, fieldIndex) =>
          field.outputOrdinal !== fieldIndex || field.displayName !== names[fieldIndex]
      )
    ) {
      return { ok: false };
    }
    inputs.push({
      relationId: binding.relationId,
      ...table,
      sourceRef: binding.sourceRef,
      fields: fields.map((field, fieldIndex) => ({
        name: names[fieldIndex]!,
        fieldId: field.fieldId,
        dataType: inspectedTypes[fieldIndex]!.dataType,
        nullable: inspectedTypes[fieldIndex]!.nullable,
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
    return { ok: false };
  }

  let workingFields = inputs[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
    dataType: field.dataType,
    nullable: field.nullable,
  }));
  const crossRelations: DvtSubstraitCrossProjection['crossRelations'][number][] = [];
  const stageOutputs: { sourceFieldId: string }[][] = [];
  let outputs: DvtSubstraitCrossProjection['outputs'][number][] = [];
  for (const [crossIndex, crossRel] of tree.crosses.entries()) {
    if (crossRel.relType.case !== 'cross') return { ok: false };
    const cross = crossRel.relType.value;
    const relAnchor = inputs.length + crossIndex + 1;
    const outputMapping =
      cross.common?.emitKind.case === 'emit' ? cross.common.emitKind.value.outputMapping : null;
    const rightInput = inputs[crossIndex + 1]!;
    const availableFields = [
      ...workingFields,
      ...rightInput.fields.map<JoinOriginField>((field) => ({
        inputIndex: crossIndex + 1,
        name: field.name,
        fieldId: field.fieldId,
        dataType: field.dataType,
        nullable: field.nullable,
      })),
    ];
    const binding = sidecar.relations.find((relation) => relation.relAnchor === relAnchor);
    if (
      cross.common?.relAnchor !== relAnchor ||
      cross.common.hint != null ||
      cross.common.advancedExtension != null ||
      cross.advancedExtension != null ||
      outputMapping == null ||
      (outputMapping.length === 0 && crossIndex !== tree.crosses.length - 1) ||
      new Set(outputMapping).size !== outputMapping.length ||
      outputMapping.some((ordinal) => ordinal < 0 || ordinal >= availableFields.length) ||
      binding == null ||
      binding.sourceRef != null ||
      binding.displayName !==
        inputs
          .slice(0, crossIndex + 2)
          .map((input) => input.table)
          .join('+')
    ) {
      return { ok: false };
    }
    const nextFields = outputMapping.map((ordinal) => availableFields[ordinal]!);
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const finalStage = crossIndex === tree.crosses.length - 1;
    const names = finalStage ? root.value.names : fields.map((field) => field.displayName);
    if (
      fields.length !== nextFields.length ||
      names.length !== nextFields.length ||
      fields.some((field, outputOrdinal) => {
        const origin = nextFields[outputOrdinal];
        return (
          field.outputOrdinal !== outputOrdinal ||
          field.displayName !== names[outputOrdinal] ||
          origin == null ||
          (field.sourceFieldId != null && field.sourceFieldId !== origin.fieldId)
        );
      })
    ) {
      return { ok: false };
    }
    crossRelations.push({ relationId: binding.relationId, relAnchor });
    stageOutputs.push(nextFields.map(({ fieldId }) => ({ sourceFieldId: fieldId })));
    workingFields = nextFields;
    if (finalStage) {
      outputs = nextFields.map((origin, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        fieldId: fields[outputOrdinal]!.fieldId,
        dataType: origin.dataType,
        nullable: origin.nullable,
        outputOrdinal,
        source: {
          inputIndex: origin.inputIndex,
          name: origin.name,
          fieldId: origin.fieldId,
        },
      }));
    }
  }
  return { ok: true, projection: { inputs, crossRelations, stageOutputs, outputs } };
}
