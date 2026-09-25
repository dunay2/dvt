import { describe, expect, it } from 'vitest';

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { projectCanvasModelComposition } from './canvasModelCompositionProjection';

function relation(
  locator: string,
  operator: CanvasRelationalTreeNode['operator'],
  children: CanvasRelationalTreeNode['children'] = []
): CanvasRelationalTreeNode {
  return {
    locator,
    operator,
    substraitKind: operator,
    relationId: locator,
    displayName: locator,
    sourceRef: null,
    output: { fields: [] },
    expressionRefs: [],
    decorations: [],
    children,
  };
}

describe('Model composition projection', () => {
  it('orders arbitrary relation branches from inputs to the final result', () => {
    const root = relation('limit', 'fetch', [
      {
        role: 'input',
        ordinal: 0,
        node: relation('join', 'join', [
          { role: 'left', ordinal: 0, node: relation('orders', 'read') },
          {
            role: 'right',
            ordinal: 1,
            node: relation('filtered-clients', 'filter', [
              { role: 'input', ordinal: 0, node: relation('clients', 'read') },
            ]),
          },
        ]),
      },
    ]);

    expect(projectCanvasModelComposition(root).map((step) => step.locator)).toEqual([
      'orders',
      'clients',
      'filtered-clients',
      'join',
      'limit',
    ]);
  });
});
