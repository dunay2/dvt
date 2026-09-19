/** Owns the bounded mixed profile `(admitted JoinRel) CrossRel ReadRel`. */
import type { Rel, RelCommon } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, toBinary } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DvtSubstraitAuthoringSidecarV1Schema,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { inspectDvtSubstraitCrossDraft } from './substraitCrossReader.js';
import type {
  DvtSubstraitCrossDraft,
  DvtSubstraitCrossInspection,
  DvtSubstraitMixedCrossInspection,
} from './substraitCrossReadModel.js';
import {
  flattenNInputJoinTree,
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasSameConnectionRef,
  hasUniqueJoinSidecarIdentity,
  joinFieldType,
  namedTableIdentity,
} from './substraitJoinInspectionGuards.js';
import { inspectDvtSubstraitJoinDraft } from './substraitJoinReader.js';

export function inspectDvtSubstraitAcceptedCrossDraft(
  draft: DvtSubstraitCrossDraft
): DvtSubstraitCrossInspection {
  const pure = inspectDvtSubstraitCrossDraft(draft);
  if (pure.ok) return pure;
  const mixed = inspectDvtSubstraitMixedCrossDraft(draft);
  return mixed.ok ? { ok: true, projection: mixed.projection.projection } : { ok: false };
}

function relationCommon(rel: Rel): RelCommon | null {
  switch (rel.relType.case) {
    case 'read':
    case 'join':
      return rel.relType.value.common ?? null;
    default:
      return null;
  }
}

function selectedJoinDraft(
  draft: DvtSubstraitCrossDraft,
  left: Rel,
  leftRelationId: string
): DvtSubstraitCrossDraft | null {
  const tree = flattenNInputJoinTree(left);
  if (tree == null) return null;
  const ordered = [...tree.reads, ...tree.joins];
  const anchors = ordered.map((rel) => relationCommon(rel)?.relAnchor);
  if (anchors.some((anchor) => anchor == null) || new Set(anchors).size !== anchors.length) {
    return null;
  }
  const anchorSet = new Set(anchors as number[]);
  const relations = draft.sidecar.relations.filter((relation) => anchorSet.has(relation.relAnchor));
  if (relations.length !== ordered.length) return null;
  const relationIds = new Set(relations.map((relation) => relation.relationId));
  const fields = draft.sidecar.fields.filter((field) => relationIds.has(field.relationId));
  const names = fields
    .filter((field) => field.relationId === leftRelationId)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
    .map((field) => field.displayName);
  if (names.length === 0 || names.some((name) => name == null)) return null;

  const plan = clone(PlanSchema, draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'cross') return null;
  const selected = root.value.input.relType.value.left;
  if (selected == null) return null;
  root.value.input = selected;
  root.value.names = names as string[];
  const remap = new Map(anchors.map((anchor, index) => [anchor!, index + 1]));
  const clonedTree = flattenNInputJoinTree(selected);
  if (clonedTree == null) return null;
  for (const rel of [...clonedTree.reads, ...clonedTree.joins]) {
    const common = relationCommon(rel);
    if (common?.relAnchor == null) return null;
    const nextAnchor = remap.get(common.relAnchor);
    if (nextAnchor == null) return null;
    common.relAnchor = nextAnchor;
  }
  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...draft.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: relations.map((relation) => ({
        ...relation,
        relAnchor: remap.get(relation.relAnchor)!,
      })),
      fields,
    }),
  };
}

export function inspectDvtSubstraitMixedCrossDraft(
  draft: DvtSubstraitCrossDraft
): DvtSubstraitMixedCrossInspection {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft)
  ) {
    return { ok: false };
  }
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input?.relType.case !== 'cross' ||
    root.value.names.length === 0 ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return { ok: false };
  }
  const cross = root.value.input.relType.value;
  if (cross.left?.relType.case !== 'join' || cross.right?.relType.case !== 'read') {
    return { ok: false };
  }
  const leftCommon = cross.left.relType.value.common;
  const rightCommon = cross.right.relType.value.common;
  const crossCommon = cross.common;
  if (
    leftCommon == null ||
    rightCommon == null ||
    crossCommon == null ||
    leftCommon.relAnchor == null ||
    rightCommon.relAnchor == null ||
    crossCommon.relAnchor == null ||
    crossCommon.emitKind.case !== 'emit' ||
    crossCommon.hint != null ||
    crossCommon.advancedExtension != null ||
    cross.advancedExtension != null
  ) {
    return { ok: false };
  }
  const leftBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === leftCommon.relAnchor
  );
  const rightBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === rightCommon.relAnchor
  );
  const crossBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === crossCommon.relAnchor
  );
  if (
    leftBinding == null ||
    leftBinding.sourceRef != null ||
    rightBinding?.sourceRef == null ||
    crossBinding == null ||
    crossBinding.sourceRef != null
  ) {
    return { ok: false };
  }
  const leftDraft = selectedJoinDraft(draft, cross.left, leftBinding.relationId);
  if (leftDraft == null) return { ok: false };
  const left = inspectDvtSubstraitJoinDraft(leftDraft);
  const rightTable = namedTableIdentity(cross.right);
  const rightNames = cross.right.relType.value.baseSchema?.names;
  const rightTypes = cross.right.relType.value.baseSchema?.struct?.types?.map(joinFieldType);
  const rightFields = draft.sidecar.fields
    .filter((field) => field.relationId === rightBinding.relationId)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  if (
    !left.ok ||
    rightTable == null ||
    rightBinding.displayName !== rightTable.table ||
    rightNames == null ||
    rightTypes == null ||
    rightNames.length === 0 ||
    rightNames.length !== rightTypes.length ||
    rightTypes.some((type) => type == null) ||
    rightFields.length !== rightNames.length ||
    rightFields.some(
      (field, index) => field.outputOrdinal !== index || field.displayName !== rightNames[index]
    ) ||
    rightBinding.sourceRef.connectionRef.provider !== 'postgres' ||
    !hasSameConnectionRef(
      left.projection.inputs[0]!.sourceRef.connectionRef,
      rightBinding.sourceRef.connectionRef
    ) ||
    left.projection.inputs.some(
      (input) =>
        input.sourceRef.sourceObjectId === rightBinding.sourceRef!.sourceObjectId &&
        hasSameConnectionRef(input.sourceRef.connectionRef, rightBinding.sourceRef!.connectionRef)
    )
  ) {
    return { ok: false };
  }
  const rightInput = {
    relationId: rightBinding.relationId,
    ...rightTable,
    sourceRef: rightBinding.sourceRef,
    fields: rightFields.map((field, index) => ({
      name: rightNames[index]!,
      fieldId: field.fieldId,
      dataType: rightTypes[index]!.dataType,
      nullable: rightTypes[index]!.nullable,
    })),
  };
  const available = [
    ...left.projection.outputs.map((output) => ({
      originFieldId: output.source.fieldId,
      inputIndex: output.source.inputIndex,
      name: output.source.name,
      dataType: output.dataType,
      nullable: output.nullable,
    })),
    ...rightInput.fields.map((field) => ({
      originFieldId: field.fieldId,
      inputIndex: left.projection.inputs.length,
      name: field.name,
      dataType: field.dataType,
      nullable: field.nullable,
    })),
  ];
  const mapping = crossCommon.emitKind.value.outputMapping;
  const selected = mapping.map((ordinal) => available[ordinal]);
  const stageFields = draft.sidecar.fields
    .filter((field) => field.relationId === crossBinding.relationId)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  const expectedDisplayName = `${leftBinding.displayName}+${rightTable.table}`;
  if (
    crossBinding.displayName !== expectedDisplayName ||
    mapping.length === 0 ||
    new Set(mapping).size !== mapping.length ||
    selected.some((field) => field == null) ||
    stageFields.length !== selected.length ||
    root.value.names.length !== selected.length ||
    stageFields.some(
      (field, index) =>
        field.outputOrdinal !== index ||
        field.displayName !== root.value.names[index] ||
        field.sourceFieldId !== selected[index]!.originFieldId
    ) ||
    draft.sidecar.relations.length !== leftDraft.sidecar.relations.length + 2
  ) {
    return { ok: false };
  }
  return {
    ok: true,
    projection: {
      leftJoin: left.projection,
      rightInput,
      projection: {
        inputs: [...left.projection.inputs, rightInput],
        crossRelations: [{ relationId: crossBinding.relationId, relAnchor: crossCommon.relAnchor }],
        stageOutputs: [selected.map((field) => ({ sourceFieldId: field!.originFieldId }))],
        outputs: selected.map((field, index) => ({
          name: root.value.names[index]!,
          fieldId: stageFields[index]!.fieldId,
          dataType: field!.dataType,
          nullable: field!.nullable,
          outputOrdinal: index,
          source: {
            inputIndex: field!.inputIndex,
            name: field!.name,
            fieldId: field!.originFieldId,
          },
        })),
      },
    },
  };
}
