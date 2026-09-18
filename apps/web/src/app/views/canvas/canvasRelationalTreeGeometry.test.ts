import { describe, expect, it } from 'vitest';

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { layoutCanvasRelationalTree } from './canvasRelationalTreeGeometry';

function relation(
  locator: string,
  children: CanvasRelationalTreeNode['children'] = []
): CanvasRelationalTreeNode {
  return {
    locator,
    operator: children.length === 0 ? 'read' : 'join',
    substraitKind: children.length === 0 ? 'read' : 'join',
    relationId: locator,
    displayName: locator,
    sourceRef: null,
    output: { fields: [] },
    expressionRefs: [],
    decorations: [],
    children,
  };
}

describe('canvas relational-tree graph geometry', () => {
  it('places leaves before operations and the Transform output after the root', () => {
    const root = relation('join', [
      { role: 'left', ordinal: 0, node: relation('orders') },
      { role: 'right', ordinal: 1, node: relation('clients') },
    ]);

    const layout = layoutCanvasRelationalTree(root);
    const join = layout.nodes.find((node) => node.node.locator === 'join')!;
    const leaves = layout.nodes.filter((node) => node.node.operator === 'read');

    expect(leaves.every((node) => node.x < join.x)).toBe(true);
    expect(layout.output.x).toBeGreaterThan(join.x);
    expect(layout.edges.map((edge) => edge.role)).toEqual(['left', 'right']);
    expect(new Set(leaves.map((node) => node.y)).size).toBe(2);
  });
});
