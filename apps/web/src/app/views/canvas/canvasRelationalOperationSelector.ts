/** Select presentation identity from canonical relation semantics. */
import {
  SetRel_SetOp,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import type { CanvasPresentationOperation } from './canvasRelationalOperationPresentation';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';

export function canvasPresentationOperationForRel(rel: Rel): CanvasPresentationOperation {
  switch (rel.relType.case) {
    case 'join':
      return canvasJoinOperationForType(rel.relType.value.type);
    case 'cross':
      return 'cross_join';
    case 'read':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return rel.relType.case;
    case 'project':
      return rel.relType.value.expressions.some(
        (expression) => expression.rexType.case === 'windowFunction'
      )
        ? 'window'
        : 'projection';
    case 'set':
      return setPresentationOperation(rel.relType.value.op);
    default:
      return 'unsupported';
  }
}

function setPresentationOperation(op: SetRel_SetOp): CanvasPresentationOperation {
  switch (op) {
    case SetRel_SetOp.UNION_ALL:
      return 'union_all';
    case SetRel_SetOp.UNION_DISTINCT:
      return 'union_distinct';
    case SetRel_SetOp.INTERSECTION_MULTISET:
      return 'intersect_distinct';
    case SetRel_SetOp.MINUS_PRIMARY:
      return 'except_distinct';
    case SetRel_SetOp.INTERSECTION_MULTISET_ALL:
      return 'intersect_all';
    case SetRel_SetOp.MINUS_PRIMARY_ALL:
      return 'except_all';
    default:
      return 'unsupported';
  }
}
