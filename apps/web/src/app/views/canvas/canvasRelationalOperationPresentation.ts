/** Owned concern: shared presentation metadata; never admission, execution or semantic authority. */
import {
  SetRel_SetOp,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  AlertTriangle,
  ArrowDownUp,
  ChartNoAxesCombined,
  Columns3,
  Filter,
  Layers3,
  ListFilter,
  Sigma,
  Table2,
} from 'lucide-react';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';

export type CanvasRelationalOperationPresentation = Readonly<{
  labelKey: keyof CanvasViewCopy;
  icon: typeof Table2 | typeof CanvasRelationalJoinIcon;
  category:
    | 'read'
    | 'project'
    | 'join'
    | 'cross'
    | 'set'
    | 'filter'
    | 'aggregate'
    | 'window'
    | 'sort'
    | 'fetch'
    | 'unsupported';
}>;

export const canvasRelationalOperationPresentation = {
  projection: {
    labelKey: 'relationalTreeProjectOperationLabel',
    icon: Columns3,
    category: 'project',
  },
  inner_join: {
    labelKey: 'inspectorDvtSubstraitInnerJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  left_join: {
    labelKey: 'inspectorDvtSubstraitLeftJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  right_join: {
    labelKey: 'inspectorDvtSubstraitRightJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  full_outer_join: {
    labelKey: 'inspectorDvtSubstraitFullOuterJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  left_semi_join: {
    labelKey: 'inspectorDvtSubstraitLeftSemiJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  left_anti_join: {
    labelKey: 'inspectorDvtSubstraitLeftAntiJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  right_semi_join: {
    labelKey: 'inspectorDvtSubstraitRightSemiJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  right_anti_join: {
    labelKey: 'inspectorDvtSubstraitRightAntiJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'join',
  },
  cross_join: {
    labelKey: 'inspectorDvtSubstraitCrossJoinAction',
    icon: CanvasRelationalJoinIcon,
    category: 'cross',
  },
  union_all: { labelKey: 'inspectorDvtSubstraitUnionAllAction', icon: Layers3, category: 'set' },
  union_distinct: {
    labelKey: 'inspectorDvtSubstraitUnionDistinctAction',
    icon: Layers3,
    category: 'set',
  },
  intersect_distinct: {
    labelKey: 'inspectorDvtSubstraitIntersectDistinctAction',
    icon: Layers3,
    category: 'set',
  },
  except_distinct: {
    labelKey: 'inspectorDvtSubstraitExceptDistinctAction',
    icon: Layers3,
    category: 'set',
  },
  intersect_all: {
    labelKey: 'inspectorDvtSubstraitIntersectAllAction',
    icon: Layers3,
    category: 'set',
  },
  except_all: { labelKey: 'inspectorDvtSubstraitExceptAllAction', icon: Layers3, category: 'set' },
} as const satisfies Record<CanvasRelationalOperation, CanvasRelationalOperationPresentation>;

export type CanvasPresentationOperation =
  | CanvasRelationalOperation
  | 'read'
  | 'filter'
  | 'aggregate'
  | 'window'
  | 'sort'
  | 'fetch'
  | 'unsupported';

export const canvasRelationalUnaryPresentation = {
  read: { labelKey: 'operationReadLabel', icon: Table2, category: 'read' },
  filter: { labelKey: 'operationFilterLabel', icon: Filter, category: 'filter' },
  aggregate: { labelKey: 'operationAggregateLabel', icon: Sigma, category: 'aggregate' },
  window: { labelKey: 'operationWindowLabel', icon: ChartNoAxesCombined, category: 'window' },
  sort: { labelKey: 'operationSortLabel', icon: ArrowDownUp, category: 'sort' },
  fetch: { labelKey: 'operationFetchLabel', icon: ListFilter, category: 'fetch' },
  unsupported: {
    labelKey: 'operationUnsupportedLabel',
    icon: AlertTriangle,
    category: 'unsupported',
  },
} as const satisfies Record<
  Exclude<CanvasPresentationOperation, CanvasRelationalOperation>,
  CanvasRelationalOperationPresentation
>;

export function resolveCanvasRelationalOperationPresentation(operation: unknown) {
  if (typeof operation !== 'string') return canvasRelationalUnaryPresentation.unsupported;
  if (Object.hasOwn(canvasRelationalOperationPresentation, operation)) {
    return canvasRelationalOperationPresentation[operation as CanvasRelationalOperation];
  }
  return Object.hasOwn(canvasRelationalUnaryPresentation, operation)
    ? canvasRelationalUnaryPresentation[operation as keyof typeof canvasRelationalUnaryPresentation]
    : canvasRelationalUnaryPresentation.unsupported;
}

/** Read the canonical selector, without inferring an operation from SQL or its display name. */
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
      switch (rel.relType.value.op) {
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
    default:
      return 'unsupported';
  }
}
