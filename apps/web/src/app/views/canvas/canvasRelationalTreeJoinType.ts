/** Owned concern: map Canvas JOIN intent onto the final canonical Substrait JoinRel stage. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinDraft,
  setDvtSubstraitJoinType,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitJoinType,
} from './canvasDvtSubstraitJoinComposition';

type CanvasJoinOperation = Extract<CanvasRelationalOperation, 'inner_join' | 'left_join'>;

export function toSubstraitJoinType(operation?: CanvasJoinOperation): DvtSubstraitJoinType {
  return operation === 'left_join' ? JoinRel_JoinType.LEFT : JoinRel_JoinType.INNER;
}

export function setFinalCanvasJoinType(
  draft: DvtSubstraitJoinDraft,
  operation: CanvasJoinOperation
): DvtSubstraitJoinDraft | null {
  if (!inspectDvtSubstraitJoinAcceptedDraft(draft).ok) return null;
  const inspection = inspectDvtSubstraitJoinDraft(draft);
  const joinRelationId = inspection.ok
    ? inspection.projection.joinRelations.at(-1)?.relationId
    : null;
  return joinRelationId == null
    ? null
    : setDvtSubstraitJoinType({
        draft,
        joinRelationId,
        joinType: toSubstraitJoinType(operation),
      });
}
