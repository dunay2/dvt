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

  it('reserves expanded card bounds across uneven nested branches without overlap', () => {
    const branch = (id: string): CanvasRelationalTreeNode =>
      relation(id, [
        { role: 'left', ordinal: 0, node: relation(`${id}-left`) },
        { role: 'right', ordinal: 1, node: relation(`${id}-right`) },
      ]);
    const root = relation('root', [
      { role: 'left', ordinal: 0, node: branch('upper') },
      { role: 'right', ordinal: 1, node: branch('lower') },
    ]);
    const sizes = new Map([
      ['root', { width: 420, height: 580 }],
      ['upper', { width: 420, height: 420 }],
      ['lower', { width: 420, height: 240 }],
    ]);
    const layout = layoutCanvasRelationalTree(root, sizes);
    for (const placed of layout.nodes) {
      expect(placed.height).toBe(sizes.get(placed.node.locator)?.height ?? 76);
      expect(placed.x + placed.width).toBeLessThan(layout.output.x);
      expect(placed.y + placed.height).toBeLessThan(layout.height);
      for (const other of layout.nodes.filter((node) => node !== placed)) {
        const overlap =
          placed.x < other.x + other.width &&
          placed.x + placed.width > other.x &&
          placed.y < other.y + other.height &&
          placed.y + placed.height > other.y;
        expect(overlap, `${placed.node.locator} overlaps ${other.node.locator}`).toBe(false);
      }
    }
  });
});
