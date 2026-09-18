// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';

const COPY = {
  inspectorDbtOriginLabel: 'Input',
  inspectorDvtRelationalLeftInput: 'Left input',
  inspectorDvtRelationalRightInput: 'Right input',
  reactFlowFitViewLabel: 'Fit graph to view',
  reactFlowZoomInLabel: 'Zoom in',
  reactFlowZoomOutLabel: 'Zoom out',
  relationalTreeLabel: 'Relational tree',
  relationalTreeValidMessage: 'Valid expression',
  relationalTreeOutputLabel: 'Output',
  relationalTreePrimaryInputLabel: 'Primary input',
  relationalTreeSecondaryInputTemplate: 'Secondary input {ordinal}',
} as CanvasRelationalTreeWorkbenchCopy;

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

describe('Canvas relational-tree branching view', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('lays out every N-ary branch horizontally with explicit roles', () => {
    const tree = relation('set', 'set', [
      { role: 'primary', ordinal: 0, node: relation('north', 'read') },
      { role: 'secondary', ordinal: 1, node: relation('south', 'read') },
      { role: 'secondary', ordinal: 2, node: relation('west', 'read') },
    ]);

    act(() => {
      root.render(
        <CanvasRelationalTreeView
          outputName="Model 1"
          root={tree}
          selectedLocator="set"
          copy={COPY}
          onSelect={() => undefined}
        />
      );
    });

    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-layout"]')
        ?.getAttribute('data-layout')
    ).toBe('graph');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-layout"]')
        ?.getAttribute('data-direction')
    ).toBe('left-to-right');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-children"]')
        ?.getAttribute('data-child-count')
    ).toBe('3');
    expect(container.querySelectorAll('[role="treeitem"]')).toHaveLength(4);
    expect(container.textContent).toContain('Secondary input 3');
    expect(
      Array.from(container.querySelectorAll('svg text'), (label) => label.textContent)
    ).toEqual(['1', '2', '3']);
    const rootLeft = Number.parseFloat(
      container.querySelector<HTMLElement>('[data-locator="set"]')?.closest<HTMLElement>('li')
        ?.style.left ?? '0'
    );
    const leafPositions = Array.from(
      container.querySelectorAll<HTMLElement>('li[data-parent-locator="set"]')
    ).map((item) => Number.parseFloat(item.style.left));
    expect(leafPositions.every((left) => left < rootLeft)).toBe(true);
    const outputLeft = Number.parseFloat(
      container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-output"]')?.style
        .left ?? '0'
    );
    expect(outputLeft).toBeGreaterThan(rootLeft);
    expect(container.textContent).toContain('Model 1');
    expect(container.querySelector('[data-slot="canvas-relational-tree-zoom"]')?.textContent).toBe(
      '100%'
    );
  });

  it('names sources directly and labels each nested JOIN input by its canonical role', () => {
    const tree = relation('outer', 'join', [
      {
        role: 'left',
        ordinal: 0,
        node: relation('inner', 'join', [
          { role: 'left', ordinal: 0, node: relation('order_details', 'read') },
          { role: 'right', ordinal: 1, node: relation('client', 'read') },
        ]),
      },
      { role: 'right', ordinal: 1, node: relation('orders', 'read') },
    ]);
    act(() =>
      root.render(
        <CanvasRelationalTreeView
          outputName="Model 1"
          root={tree}
          selectedLocator="outer"
          copy={COPY}
          onSelect={() => undefined}
        />
      )
    );
    for (const name of ['order_details', 'client', 'orders']) {
      const card = container.querySelector(`[data-locator="${name}"]`)!;
      expect(card.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent).toBe(
        name
      );
      expect(card.textContent).not.toContain('READ');
      expect(card.getAttribute('aria-label')).toContain(name);
      expect(card.getAttribute('data-operator')).toBe('read');
    }
    for (const parent of ['outer', 'inner']) {
      const edges = container.querySelector(`svg [data-parent-locator="${parent}"]`)!;
      expect(edges.querySelector('[data-role="left"] text')?.textContent).toBe('L');
      expect(edges.querySelector('[data-role="right"] text')?.textContent).toBe('R');
    }
  });
});
