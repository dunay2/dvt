// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import type { CanvasPresentationOperation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

function projectNode(
  operation: CanvasPresentationOperation,
  scalarFieldCount: number,
  windowFieldCount: number
): CanvasRelationalTreeNode {
  return {
    locator: 'project',
    operator: 'project',
    substraitKind: 'project',
    operation,
    relationId: 'relation:project',
    displayName: 'project',
    sourceRef: null,
    output: { fields: [] },
    expressionRefs:
      scalarFieldCount + windowFieldCount === 0 ? [] : [{ slot: 'project-expression', ordinal: 0 }],
    projectionSummary: { scalarFieldCount, windowFieldCount, passthroughFieldCount: 18 },
    decorations: [],
    children: [],
  };
}

describe('Canvas field transformation stage presentation', () => {
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

  it('renders the projected Expression identity instead of inferring it in the component', () => {
    const copy = resolveCanvasViewCopy('es');
    act(() =>
      root.render(
        <CanvasRelationalTreeView
          outputName="Customers"
          root={projectNode('expression', 2, 0)}
          selectedLocator="project"
          copy={copy}
          onSelect={() => undefined}
        />
      )
    );

    const card = container.querySelector('[data-presentation="expression"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain(copy.relationalTreeExpressionStageLabel);
    expect(card?.textContent).toContain('2');
    expect(card?.textContent).toContain('18');
  });

  it('renders one mixed field-transformation card for scalar and Window outputs', () => {
    const copy = resolveCanvasViewCopy('en');
    act(() =>
      root.render(
        <CanvasRelationalTreeView
          outputName="Customers"
          root={projectNode('field_transform', 2, 1)}
          selectedLocator="project"
          copy={copy}
          onSelect={() => undefined}
        />
      )
    );

    const card = container.querySelector('[data-presentation="field_transform"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain(copy.relationalTreeFieldTransformationStageLabel);
    expect(card?.textContent).toContain('2');
    expect(card?.textContent).toContain('1');
  });
});
