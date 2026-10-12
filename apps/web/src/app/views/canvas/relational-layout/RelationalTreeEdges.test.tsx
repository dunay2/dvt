// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  layoutCanvasRelationalTree,
} from '../canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeNode } from '../canvasRelationalTreeProjection';
import { RelationalTreeEdges } from './RelationalTreeEdges';

const rootNode: CanvasRelationalTreeNode = {
  locator: 'relation:join',
  relationId: 'relation:join',
  operator: 'join',
  substraitKind: 'join',
  operation: 'inner_join',
  displayName: null,
  sourceRef: null,
  output: { fields: [] },
  expressionRefs: [],
  decorations: [],
  children: [],
};

describe('RelationalTreeEdges', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('draws the terminal arrow to the visible edge of the Output Input port', () => {
    const layout = layoutCanvasRelationalTree(
      rootNode,
      new Map(),
      new Map([[CANVAS_RELATIONAL_OUTPUT_POSITION_ID, { x: 520, y: 260 }]])
    );
    act(() => {
      root.render(
        <RelationalTreeEdges
          layout={layout}
          removeConnectionLabel="Remove connection"
          outputRelationId={rootNode.relationId}
        />
      );
    });

    const edge = container.querySelector<SVGPathElement>(
      '[data-slot="canvas-relational-output-edge"]'
    )!;
    expect(edge.getAttribute('marker-end')).toMatch(/^url\(#.+\)$/);
    expect(edge.getAttribute('d')).toContain(' C ');
    expect(edge.getAttribute('d')).toMatch(
      new RegExp(`${layout.output!.x - 10} ${layout.output!.y + layout.output!.height / 2}$`)
    );
  });
});
