/** Change one JoinRel without reconstructing its operands or peeling its consumers. */
import {
  JoinRel_JoinType,
  type JoinRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  cloneLocalRelation,
  readRelationStructure,
  SubstraitAnalysisError,
  type RelationChangeSet,
} from '@dvt/substrait-analysis';
import { dvtSubstraitJoinRetainedSide, type DvtSubstraitJoinType } from '@dvt/postgres-projection';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { validateRelationChanges } from './canvasRelationChangeValidation';

export const editableJoinTypes = [
  JoinRel_JoinType.INNER,
  JoinRel_JoinType.LEFT,
  JoinRel_JoinType.RIGHT,
  JoinRel_JoinType.OUTER,
  JoinRel_JoinType.LEFT_SEMI,
  JoinRel_JoinType.LEFT_ANTI,
  JoinRel_JoinType.RIGHT_SEMI,
  JoinRel_JoinType.RIGHT_ANTI,
] as const;
const admitted = new Set<JoinRel_JoinType>(editableJoinTypes);

export function joinOutputScope(type: JoinRel_JoinType, widths: readonly number[]) {
  if (!admitted.has(type))
    throw new SubstraitAnalysisError('unsupported_relation', 'Unknown JOIN output semantics.');
  const retained = dvtSubstraitJoinRetainedSide(type as DvtSubstraitJoinType);
  return Array.from({ length: widths[0]! + widths[1]! }, (_, ordinal) => ordinal).filter(
    (ordinal) =>
      retained === 'both' || (ordinal < widths[0]! ? retained === 'left' : retained === 'right')
  );
}

export function selectedJoinTypeMapping(
  message: JoinRel,
  widths: readonly number[],
  type: DvtSubstraitJoinType
): readonly number[] | null {
  if (!admitted.has(message.type) || !admitted.has(type)) return null;
  const before = joinOutputScope(message.type as DvtSubstraitJoinType, widths);
  const after = joinOutputScope(type, widths);
  const emit = message.common?.emitKind;
  const output = emit?.case === 'emit' ? emit.value.outputMapping : before.map((_, index) => index);
  const mapping = output.map((ordinal) => after.indexOf(before[ordinal]!));
  return mapping.some((ordinal) => ordinal < 0) ? null : mapping;
}

export async function changeSelectedJoinType(
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    joinType: DvtSubstraitJoinType;
    signal?: AbortSignal;
  }>
) {
  const selected = session.locate(request.relationId, request.expectedRevision);
  if (selected.relation.relType.case !== 'join' || !admitted.has(request.joinType))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Expected an admitted selected JOIN.',
      request.relationId
    );
  const schemas = await Promise.all(selected.inputs.map((id) => session.query(id, request.signal)));
  const relation = cloneLocalRelation(
    selected.relation,
    readRelationStructure(selected.relation).inputs
  );
  if (relation.relType.case !== 'join')
    throw new SubstraitAnalysisError('invalid_structure', 'JOIN is absent.');
  const message = relation.relType.value;
  const widths = schemas.map((schema) => schema.fields.length);
  const mapping = selectedJoinTypeMapping(message, widths, request.joinType);
  if (mapping == null)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selected JOIN type would remove an output field.',
      request.relationId
    );
  message.type = request.joinType;
  message.common!.emitKind = {
    case: 'emit',
    value: { $typeName: 'substrait.RelCommon.Emit', outputMapping: [...mapping] },
  };
  const change: RelationChangeSet = {
    expectedRevision: request.expectedRevision,
    removed: [],
    upserts: [{ relation, binding: selected.binding, fields: selected.fields }],
  };
  await validateRelationChanges(session, change, new Map(), request.signal);
  request.signal?.throwIfAborted();
  return session.apply(change);
}
