/** Same physical input, independent canonical Read identities; no production builder simulation. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';

import type { DvtSubstraitJoinDraft } from '../../src/substraitJoinReadModel.js';

import { joinDraft } from './joinDraft.js';

export function repeatedSourceDraft(joinType = JoinRel_JoinType.LEFT): DvtSubstraitJoinDraft {
  const draft = joinDraft('two');
  const root = draft.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('Expected the canonical binary JOIN fixture');
  }
  const join = root.value.input.relType.value;
  if (join.left?.relType.case !== 'read' || join.right?.relType.case !== 'read') {
    throw new Error('Expected two canonical Reads');
  }
  join.type = joinType;
  for (const read of [join.left.relType.value, join.right.relType.value]) {
    if (read.readType.case !== 'namedTable' || read.baseSchema == null) {
      throw new Error('Expected named table and field schema');
    }
    read.readType.value.names = ['raw', 'records'];
    read.baseSchema.names = ['id', 'parent_id'];
  }
  root.value.names = ['id', 'parent_id', 'related_id', 'related_parent_id'];
  for (const relation of draft.sidecar.relations) {
    relation.displayName = relation.sourceRef == null ? 'records+records' : 'records';
    if (relation.sourceRef != null) relation.sourceRef.sourceObjectId = 'raw.records';
    for (const field of draft.sidecar.fields.filter((f) => f.relationId === relation.relationId)) {
      field.displayName = (relation.sourceRef == null ? root.value.names : ['id', 'parent_id'])[
        field.outputOrdinal
      ]!;
    }
  }
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
  return draft;
}
