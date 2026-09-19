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

export type CanvasJoinOperation = Extract<
  CanvasRelationalOperation,
  'inner_join' | 'left_join' | 'right_join' | 'full_outer_join'
>;

export function isCanvasJoinOperation(operation: unknown): operation is CanvasJoinOperation {
  return (
    operation === 'inner_join' ||
    operation === 'left_join' ||
    operation === 'right_join' ||
    operation === 'full_outer_join'
  );
}

export function toSubstraitJoinType(operation?: CanvasJoinOperation): DvtSubstraitJoinType {
  switch (operation) {
    case 'left_join':
      return JoinRel_JoinType.LEFT;
    case 'right_join':
      return JoinRel_JoinType.RIGHT;
    case 'full_outer_join':
      return JoinRel_JoinType.OUTER;
    default:
      return JoinRel_JoinType.INNER;
  }
}

export function canvasJoinOperationForType(joinType: DvtSubstraitJoinType): CanvasJoinOperation {
  switch (joinType) {
    case JoinRel_JoinType.LEFT:
      return 'left_join';
    case JoinRel_JoinType.RIGHT:
      return 'right_join';
    case JoinRel_JoinType.OUTER:
      return 'full_outer_join';
    default:
      return 'inner_join';
  }
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
