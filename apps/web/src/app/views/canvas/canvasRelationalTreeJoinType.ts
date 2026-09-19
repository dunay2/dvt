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
  | 'inner_join'
  | 'left_join'
  | 'right_join'
  | 'full_outer_join'
  | 'left_semi_join'
  | 'left_anti_join'
  | 'right_semi_join'
  | 'right_anti_join'
>;

export function isCanvasJoinOperation(operation: unknown): operation is CanvasJoinOperation {
  return (
    operation === 'inner_join' ||
    operation === 'left_join' ||
    operation === 'right_join' ||
    operation === 'full_outer_join' ||
    operation === 'left_semi_join' ||
    operation === 'left_anti_join' ||
    operation === 'right_semi_join' ||
    operation === 'right_anti_join'
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
    case 'left_semi_join':
      return JoinRel_JoinType.LEFT_SEMI;
    case 'left_anti_join':
      return JoinRel_JoinType.LEFT_ANTI;
    case 'right_semi_join':
      return JoinRel_JoinType.RIGHT_SEMI;
    case 'right_anti_join':
      return JoinRel_JoinType.RIGHT_ANTI;
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
    case JoinRel_JoinType.LEFT_SEMI:
      return 'left_semi_join';
    case JoinRel_JoinType.LEFT_ANTI:
      return 'left_anti_join';
    case JoinRel_JoinType.RIGHT_SEMI:
      return 'right_semi_join';
    case JoinRel_JoinType.RIGHT_ANTI:
      return 'right_anti_join';
    default:
      return 'inner_join';
  }
}

export function canvasJoinLabelForType(joinType: JoinRel_JoinType): string {
  switch (joinType) {
    case JoinRel_JoinType.INNER:
      return 'INNER JOIN';
    case JoinRel_JoinType.LEFT:
      return 'LEFT JOIN';
    case JoinRel_JoinType.RIGHT:
      return 'RIGHT JOIN';
    case JoinRel_JoinType.OUTER:
      return 'FULL OUTER JOIN';
    case JoinRel_JoinType.LEFT_SEMI:
      return 'LEFT SEMI JOIN';
    case JoinRel_JoinType.LEFT_ANTI:
      return 'LEFT ANTI JOIN';
    case JoinRel_JoinType.RIGHT_SEMI:
      return 'RIGHT SEMI JOIN';
    case JoinRel_JoinType.RIGHT_ANTI:
      return 'RIGHT ANTI JOIN';
    default:
      return 'UNSUPPORTED JOIN';
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
