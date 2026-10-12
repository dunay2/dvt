/** Owned concern: every operation has an explicit inspector and scalar ownership is not inferred. */
import { describe, expect, it } from 'vitest';
import type { CanvasPresentationOperation } from '../canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from '../canvasRelationalTreeProjection';
import { resolveRelationalInspection } from './inspectionModel';

type Case = readonly [
  CanvasRelationalTreeOperator,
  'source' | 'cross' | 'summary' | 'expressions' | 'join' | 'unsupported',
  CanvasRelationalTreeExpressionRef['slot']?,
];
const operations = {
  read: ['read', 'source'],
  projection: ['project', 'expressions', 'project-expression'],
  field_transform: ['project', 'expressions', 'project-expression'],
  filter: ['filter', 'expressions', 'filter-condition'],
  aggregate: ['aggregate', 'expressions', 'aggregate-expression'],
  window: ['project', 'expressions', 'project-expression'],
  sort: ['sort', 'summary', 'sort-key'],
  fetch: ['fetch', 'summary'],
  cross_join: ['cross', 'cross'],
  inner_join: ['join', 'join', 'join-condition'],
  left_join: ['join', 'join', 'join-condition'],
  right_join: ['join', 'join', 'join-condition'],
  full_outer_join: ['join', 'join', 'join-condition'],
  left_semi_join: ['join', 'join', 'join-condition'],
  left_anti_join: ['join', 'join', 'join-condition'],
  right_semi_join: ['join', 'join', 'join-condition'],
  right_anti_join: ['join', 'join', 'join-condition'],
  union_all: ['set', 'summary'],
  union_distinct: ['set', 'summary'],
  intersect_distinct: ['set', 'summary'],
  intersect_all: ['set', 'summary'],
  except_distinct: ['set', 'summary'],
  except_all: ['set', 'summary'],
  unsupported: ['unsupported', 'unsupported'],
} as const satisfies Record<CanvasPresentationOperation, Case>;

function node(
  operation: CanvasPresentationOperation,
  overrides: Partial<CanvasRelationalTreeNode> = {}
): CanvasRelationalTreeNode {
  const [operator, , slot] = operations[operation] as Case;
  return {
    operation,
    operator,
    substraitKind: operator,
    relationId: 'selected',
    locator: 'revision-bound-locator',
    displayName: 'Selected relation',
    sourceRef: null,
    output: { fields: [] },
    children: [],
    decorations: [],
    expressionRefs: slot == null ? [] : [{ slot, ordinal: 0 }],
    ...overrides,
  };
}

describe('applied relational inspection policy', () => {
  it.each(Object.keys(operations) as CanvasPresentationOperation[])(
    'dispatches %s with exact operation identity',
    (operation) => {
      expect(resolveRelationalInspection(node(operation))).toMatchObject({
        kind: operations[operation][1],
        operation,
        relationId: 'selected',
      });
    }
  );
  it.each(['sort', 'fetch', 'inner_join', 'window'] as const)(
    'never disguises rejected %s as admitted, even with expression references',
    (operation) => {
      expect(
        resolveRelationalInspection(node(operation, { operator: 'unsupported' }))
      ).toMatchObject({ kind: 'unsupported', operation: 'unsupported' });
    }
  );
  it.each(['inner_join', 'filter', 'aggregate', 'window'] as const)(
    'does not dispatch a foreign expression slot from %s to the scalar viewer',
    (operation) => {
      expect(
        resolveRelationalInspection(
          node(operation, { expressionRefs: [{ slot: 'sort-key', ordinal: 0 }] })
        )
      ).toMatchObject({ kind: 'summary' });
      expect(resolveRelationalInspection(node(operation, { relationId: null }))).toMatchObject({
        kind: 'summary',
      });
    }
  );
  it('handles absent selection and missing canonical operation without an INNER fallback', () => {
    expect(resolveRelationalInspection(null)).toBeNull();
    expect(resolveRelationalInspection(node('inner_join', { operation: undefined }))).toMatchObject(
      { kind: 'unsupported', operation: 'unsupported' }
    );
  });
});
