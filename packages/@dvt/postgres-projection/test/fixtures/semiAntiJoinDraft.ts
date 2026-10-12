import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { ZERO_SHA256, type DvtSubstraitJoinDraft } from '../../src/index.js';

import { joinDraft } from './joinDraft.js';

export function semiAntiJoinDraft(
  joinType:
    | JoinRel_JoinType.LEFT_SEMI
    | JoinRel_JoinType.LEFT_ANTI
    | JoinRel_JoinType.RIGHT_SEMI
    | JoinRel_JoinType.RIGHT_ANTI
): DvtSubstraitJoinDraft {
  const candidate = joinDraft('two');
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('Fixture must contain a two-input JOIN root');
  }
  const join = root.value.input.relType.value;
  if (join.common?.emitKind.case !== 'emit') throw new Error('Fixture must use explicit emit');
  const retainRight =
    joinType === JoinRel_JoinType.RIGHT_SEMI || joinType === JoinRel_JoinType.RIGHT_ANTI;
  const retainedRelation = candidate.sidecar.relations.find(
    (relation) => relation.relAnchor === (retainRight ? 2 : 1)
  )!;
  const stage = candidate.sidecar.relations.find(
    (relation) => relation.relAnchor === join.common!.relAnchor
  )!;
  const retainedFields = candidate.sidecar.fields
    .filter((field) => field.relationId === retainedRelation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const existingStageFields = new Map(
    candidate.sidecar.fields
      .filter((field) => field.relationId === stage.relationId)
      .map((field) => [field.sourceFieldId, field.fieldId] as const)
  );
  join.type = joinType;
  join.common.emitKind.value.outputMapping = retainedFields.map((_, ordinal) => ordinal);
  root.value.names = retainedFields.map((field) => field.displayName);
  candidate.sidecar.fields = [
    ...candidate.sidecar.fields.filter((field) => field.relationId !== stage.relationId),
    ...retainedFields.map((field, outputOrdinal) => ({
      fieldId: existingStageFields.get(field.fieldId)!,
      relationId: stage.relationId,
      sourceFieldId: field.fieldId,
      outputOrdinal,
      displayName: field.displayName,
    })),
  ];
  candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
  return candidate;
}
