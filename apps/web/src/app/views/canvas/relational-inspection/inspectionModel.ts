/** Owned concern: choose an applied inspector view from the admitted relational projection. */
import { resolveCanvasRelationalNodePresentation } from '../canvasRelationalNodePresentation';
import type { CanvasPresentationOperation } from '../canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from '../canvasRelationalTreeProjection';

type InspectionPolicy =
  | Readonly<{ kind: 'source' | 'summary' | 'cross' | 'unsupported' }>
  | Readonly<{ kind: 'expressions' | 'join'; slot: CanvasRelationalTreeExpressionRef['slot'] }>;

const inspectionPolicies = {
  read: { kind: 'source' },
  project: { kind: 'expressions', slot: 'project-expression' },
  filter: { kind: 'expressions', slot: 'filter-condition' },
  join: { kind: 'join', slot: 'join-condition' },
  cross: { kind: 'cross' },
  set: { kind: 'summary' },
  aggregate: { kind: 'expressions', slot: 'aggregate-expression' },
  sort: { kind: 'summary' },
  fetch: { kind: 'summary' },
  unsupported: { kind: 'unsupported' },
} as const satisfies Record<CanvasRelationalTreeOperator, InspectionPolicy>;

type InspectionIdentity = Readonly<{
  operation: CanvasPresentationOperation;
  relationId: string | null;
}>;

export type RelationalInspection = InspectionIdentity &
  (
    | Readonly<{ kind: 'source'; label: string | undefined }>
    | Readonly<{ kind: 'summary'; text: string }>
    | Readonly<{ kind: 'expressions' | 'join'; relationId: string }>
    | Readonly<{ kind: 'cross' | 'unsupported' }>
  );

export function resolveRelationalInspection(
  node: CanvasRelationalTreeNode | null
): RelationalInspection | null {
  if (node == null) return null;
  const { operation } = resolveCanvasRelationalNodePresentation(node);
  const identity = { operation, relationId: node.relationId };
  if (operation === 'unsupported') return { ...identity, kind: 'unsupported' };
  const policy = inspectionPolicies[node.operator];
  switch (policy.kind) {
    case 'source':
      return { ...identity, kind: 'source', label: node.displayName ?? undefined };
    case 'cross':
    case 'unsupported':
      return { ...identity, kind: policy.kind };
    case 'expressions':
    case 'join':
      if (node.relationId != null && node.expressionRefs.some((ref) => ref.slot === policy.slot))
        return { ...identity, kind: policy.kind, relationId: node.relationId };
      return { ...identity, kind: 'summary', text: node.displayName ?? '' };
    case 'summary':
      return { ...identity, kind: 'summary', text: node.displayName ?? '' };
  }
}
