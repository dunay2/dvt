import { describe, expect, it } from 'vitest';

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  layoutCanvasRelationalTree,
} from './canvasRelationalTreeGeometry';

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
  it('reserves zoom detail around restored positions, terminal and detached cards without rewriting them', () => {
    const root = relation('join', [
      { role: 'left', ordinal: 0, node: relation('orders') },
      { role: 'right', ordinal: 1, node: relation('clients') },
    ]);
    const detached = [relation('pending')];
    const positions = new Map([
      ['orders', { x: 40, y: 0 }],
      ['clients', { x: 40, y: 150 }],
      ['join', { x: 400, y: 100 }],
      ['pending', { x: 400, y: 250 }],
      [CANVAS_RELATIONAL_OUTPUT_POSITION_ID, { x: 690, y: 100 }],
    ]);
    const before = [...positions];
    const sizes = new Map([
      ['join', { width: 420, height: 400 }],
      ['orders', { width: 420, height: 250 }],
      ['clients', { width: 420, height: 160 }],
    ]);
    const compact = layoutCanvasRelationalTree(root, new Map(), positions, detached);
    const expanded = layoutCanvasRelationalTree(root, sizes, positions, detached);
    const bounds = [...expanded.nodes, expanded.output!];
    for (const [index, card] of bounds.entries()) {
      for (const other of bounds.slice(index + 1)) {
        expect(
          card.x < other.x + other.width &&
            card.x + card.width > other.x &&
            card.y < other.y + other.height &&
            card.y + card.height > other.y
        ).toBe(false);
      }
    }
    expect([...positions]).toEqual(before);
    expect(layoutCanvasRelationalTree(root, new Map(), positions, detached)).toEqual(compact);
    expect(layoutCanvasRelationalTree(root, sizes, positions, detached)).toEqual(expanded);
    const join = expanded.nodes.find((node) => node.node.locator === 'join')!;
    for (const edge of expanded.edges) {
      expect(edge.toX).toBe(join.x);
      const child = expanded.nodes.find((node) => node.role === edge.role)!;
      expect(edge.fromX).toBe(child.x + child.width);
      expect(edge.fromY).toBe(child.y + child.height / 2);
    }
  });
  it('places leaves before operations and the Transform output after the root', () => {
    const root = relation('join', [
      { role: 'left', ordinal: 0, node: relation('orders') },
      { role: 'right', ordinal: 1, node: relation('clients') },
    ]);

    const layout = layoutCanvasRelationalTree(root);
    const join = layout.nodes.find((node) => node.node.locator === 'join')!;
    const leaves = layout.nodes.filter((node) => node.node.operator === 'read');

    expect(leaves.every((node) => node.x < join.x)).toBe(true);
    expect(layout.output).not.toBeNull();
    expect(layout.output!.x).toBeGreaterThan(join.x);
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
    expect(layout.output).not.toBeNull();
    for (const placed of layout.nodes) {
      expect(placed.height).toBe(sizes.get(placed.node.locator)?.height ?? 76);
      expect(placed.x + placed.width).toBeLessThan(layout.output!.x);
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
  it('keeps Output without inventing connections for disconnected or empty instances', () => {
    const pending = [relation('first'), relation('second')];
    const positions = new Map([['second', { x: 300, y: 200 }]]);
    const layout = layoutCanvasRelationalTree(null, new Map(), positions, pending);
    expect(layout.output?.inputLocator).toBeNull();
    expect(layout.edges).toEqual([]);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.nodes.find((node) => node.node.relationId === 'second')).toMatchObject(
      positions.get('second')!
    );
    expect(layout.width).toBeGreaterThan(300);
    expect(layout.height).toBeGreaterThan(200);
    const empty = layoutCanvasRelationalTree(null);
    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
    expect(empty.output?.inputLocator).toBeNull();
    expect(empty.width).toBeGreaterThan(empty.output!.x + empty.output!.width);
  });
  it('uses an explicit Output position without changing its producer', () => {
    const root = relation('source');
    const outputPosition = { x: 540, y: 260 };
    const layout = layoutCanvasRelationalTree(
      root,
      new Map(),
      new Map([[CANVAS_RELATIONAL_OUTPUT_POSITION_ID, outputPosition]])
    );
    expect(layout.output).toMatchObject({ ...outputPosition, inputLocator: root.locator });
  });
});
