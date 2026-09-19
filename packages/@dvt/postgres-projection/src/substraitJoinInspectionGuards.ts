/** Owns structural and identity guards for the admitted JOIN tree. */
import {
  JoinRel_JoinType,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import {
  inspectJoinConditionChain,
  type InspectedJoinCondition,
} from './substraitJoinConditionInspection.js';
import type {
  DvtSubstraitJoinDraft,
  DvtSubstraitJoinDataType,
  DvtSubstraitJoinType,
} from './substraitJoinReadModel.js';

export const ZERO_SHA256 = '0'.repeat(64);

export function hasSameConnectionRef(
  first: ConnectedSourceRef['connectionRef'],
  second: ConnectedSourceRef['connectionRef']
): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.provider === second.provider &&
    first.connectionId === second.connectionId
  );
}

export function joinDataType(type: Type): DvtSubstraitJoinDataType | null {
  return type.kind.case === 'string' ||
    type.kind.case === 'bool' ||
    type.kind.case === 'i64' ||
    type.kind.case === 'fp64' ||
    type.kind.case === 'precisionTimestampTz'
    ? type.kind.case
    : null;
}

export function joinFieldType(
  type: Type
): Readonly<{ dataType: DvtSubstraitJoinDataType; nullable: boolean }> | null {
  const dataType = joinDataType(type);
  if (dataType == null) return null;
  switch (type.kind.case) {
    case 'string':
    case 'bool':
    case 'i64':
    case 'fp64':
    case 'precisionTimestampTz':
      return {
        dataType,
        nullable: type.kind.value.nullability !== Type_Nullability.REQUIRED,
      };
    default:
      return null;
  }
}

export function namedTableIdentity(rel: Rel): { schema: string; table: string } | null {
  if (rel.relType.case !== 'read') return null;
  const read = rel.relType.value;
  if (read.common?.emitKind.case !== undefined || read.common?.hint != null) return null;
  if (read.common?.advancedExtension != null || read.advancedExtension != null) return null;
  if (read.filter != null || read.bestEffortFilter != null || read.projection != null) return null;
  if (read.readType.case !== 'namedTable' || read.readType.value.advancedExtension != null)
    return null;
  const names = read.readType.value.names;
  if (names.some((name) => name.trim().length === 0 || name !== name.trim())) return null;
  return names.length === 2 && names[0] != null && names[1] != null
    ? { schema: names[0], table: names[1] }
    : null;
}

export function hasPinnedPlanVersion(plan: Plan): boolean {
  return (
    plan.version?.majorNumber === 0 &&
    plan.version.minorNumber === 101 &&
    plan.version.patchNumber === 0
  );
}

export function hasUniqueJoinSidecarIdentity(draft: DvtSubstraitJoinDraft): boolean {
  return (
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.relations.map((relation) => relation.relAnchor)).size ===
      draft.sidecar.relations.length &&
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size === draft.sidecar.fields.length
  );
}

export function hasCurrentJoinSemanticHash(draft: DvtSubstraitJoinDraft): boolean {
  const planSha256 = sha256Hex(toBinary(PlanSchema, draft.plan));
  return (
    draft.sidecar.semanticPlanSha256 === ZERO_SHA256 ||
    draft.sidecar.semanticPlanSha256 === planSha256
  );
}

export function inspectNInputJoinNode(
  plan: Plan,
  rel: Rel,
  relAnchor: number
): Readonly<{
  joinType: DvtSubstraitJoinType;
  conditions: readonly InspectedJoinCondition[];
  outputMapping: readonly number[];
}> | null {
  if (rel.relType.case !== 'join') return null;
  const join = rel.relType.value;
  if (
    (join.type !== JoinRel_JoinType.INNER && join.type !== JoinRel_JoinType.LEFT) ||
    join.postJoinFilter != null ||
    join.advancedExtension != null ||
    join.common?.hint != null ||
    join.common?.advancedExtension != null ||
    join.common?.relAnchor !== relAnchor ||
    join.common.emitKind.case !== 'emit' ||
    join.left == null ||
    join.right == null
  ) {
    return null;
  }
  const conditions = inspectJoinConditionChain(plan, join.expression);
  if (conditions == null || conditions.length === 0) return null;
  return {
    joinType: join.type,
    conditions,
    outputMapping: join.common.emitKind.value.outputMapping,
  };
}

export function flattenNInputJoinTree(
  rel: Rel
): Readonly<{ reads: readonly Rel[]; joins: readonly Rel[] }> | null {
  if (rel.relType.case === 'read') return { reads: [rel], joins: [] };
  if (rel.relType.case !== 'join') return null;
  const join = rel.relType.value;
  if (join.left == null || join.right == null || join.right.relType.case !== 'read') return null;
  const left = flattenNInputJoinTree(join.left);
  return left == null ? null : { reads: [...left.reads, join.right], joins: [...left.joins, rel] };
}
