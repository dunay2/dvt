/** Owned concern: map Canvas JOIN intent onto the final canonical Substrait JoinRel stage. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitJoinType } from '@dvt/postgres-projection';

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

export function toSubstraitJoinType(operation: CanvasJoinOperation): DvtSubstraitJoinType {
  switch (operation) {
    case 'inner_join':
      return JoinRel_JoinType.INNER;
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
      throw new Error(`Unsupported Canvas JOIN operation: ${String(operation)}`);
  }
}

export function canvasJoinOperationForType(
  joinType: JoinRel_JoinType
): CanvasJoinOperation | 'unsupported' {
  switch (joinType) {
    case JoinRel_JoinType.INNER:
      return 'inner_join';
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
      return 'unsupported';
  }
}
