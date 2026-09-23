/** Owns the bounded mixed profile `(admitted JoinRel) CrossRel ReadRel`. */
import { DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION } from '@dvt/contracts';
import { indexSubstraitRelations, selectDvtSubstraitRelation } from '@dvt/substrait-analysis';

import { hasConsistentJoinPhysicalSources } from './join-inspection/physicalSources.js';
import { inspectDvtSubstraitCrossDraft } from './substraitCrossReader.js';
import type {
  DvtSubstraitCrossDraft,
  DvtSubstraitCrossInspection,
  DvtSubstraitMixedCrossInspection,
} from './substraitCrossReadModel.js';
import {
  hasCurrentJoinSemanticHash,
  hasPinnedPlanVersion,
  hasSameConnectionRef,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import { inspectDvtSubstraitJoinDraft } from './substraitJoinReader.js';
import { inspectReadInputs } from './substraitReadInputs.js';

export function inspectDvtSubstraitAcceptedCrossDraft(
  draft: DvtSubstraitCrossDraft
): DvtSubstraitCrossInspection {
  const pure = inspectDvtSubstraitCrossDraft(draft);
  if (pure.ok) return pure;
  const mixed = inspectDvtSubstraitMixedCrossDraft(draft);
  return mixed.ok ? { ok: true, projection: mixed.projection.projection } : { ok: false };
}

export function inspectDvtSubstraitMixedCrossDraft(
  draft: DvtSubstraitCrossDraft
): DvtSubstraitMixedCrossInspection {
  if (
    !hasPinnedPlanVersion(draft.plan) ||
    draft.plan.relations.length !== 1 ||
    draft.sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueJoinSidecarIdentity(draft) ||
    !hasCurrentJoinSemanticHash(draft) ||
    !indexSubstraitRelations(draft).ok
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
  let leftDraft: DvtSubstraitCrossDraft;
  try {
    leftDraft = selectDvtSubstraitRelation(draft, leftBinding.relationId);
  } catch {
    return { ok: false };
  }
  const left = inspectDvtSubstraitJoinDraft(leftDraft);
  const rightInput = inspectReadInputs(draft, [cross.right])?.[0];
  if (
    !left.ok ||
    left.projection.outputs.length === 0 ||
    rightInput == null ||
    !hasSameConnectionRef(
      left.projection.inputs[0]!.sourceRef.connectionRef,
      rightBinding.sourceRef.connectionRef
    ) ||
    !hasConsistentJoinPhysicalSources([...left.projection.inputs, rightInput])
  ) {
    return { ok: false };
  }
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
  if (
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
