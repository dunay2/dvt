// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasRelationalTreeView } from './CanvasRelationalTreeView';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

function projectNode(derivedFieldCount: number, passthroughFieldCount: number): CanvasRelationalTreeNode {
  return {
    locator: 'project',
    operator: 'project',
    substraitKind: 'project',
    operation: 'projection',
    relationId: 'relation:project',
    displayName: 'project',
    sourceRef: null,
    output: { fields: [] },
    expressionRefs:
      derivedFieldCount === 0 ? [] : [{ slot: 'project-expression', ordinal: 0 }],
    projectionSummary: { derivedFieldCount, passthroughFieldCount },
    decorations: [],
    children: [],
  };
}

describe('Canvas Expression/Derive stage presentation', () => {
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

  it.each([
    ['en', 'EXPRESSION / DERIVE', 'Derived: 2 · Passthrough: 18'],
    ['es', 'EXPRESIÓN / DERIVACIÓN', 'Derivados: 2 · Directos: 18'],
  ])('labels a derived ProjectRel as an Expression stage in %s', (locale, title, summary) => {
    act(() =>
      root.render(
        <CanvasRelationalTreeView
          outputName="Customers"
          root={projectNode(2, 18)}
          selectedLocator="project"
          copy={resolveCanvasViewCopy(locale)}
          onSelect={() => undefined}
        />
      )
    );

    expect(
      container.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent
    ).toBe(title);
    expect(container.textContent).toContain(summary);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
  });

  it('keeps a ProjectRel without emitted expressions as a normal projection', () => {
    const copy = resolveCanvasViewCopy('en');
    act(() =>
      root.render(
        <CanvasRelationalTreeView
          outputName="Customers"
          root={projectNode(0, 2)}
          selectedLocator="project"
          copy={copy}
          onSelect={() => undefined}
        />
      )
    );

    expect(
      container.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent
    ).toBe(copy.relationalTreeProjectOperationLabel);
    expect(container.textContent).not.toContain('Derived:');
  });
});
