// @vitest-environment jsdom
/** Owned concern: relational workbench inspection behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import {
  createDvtSubstraitJoinDraft,
  encodeDvtSubstraitJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  setupWorkbenchTest,
  COPY,
  sourceRef,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Canvas relational-tree Workbench inspection', () => {
  setupWorkbenchTest();
  it('presents useful selected-JOIN conditions without a metadata or column-count panel', () => {
    const clients = sourceNode('clients', 'clients');
    const orders = sourceNode('orders', 'orders');
    const draft = createDvtSubstraitJoinDraft({
      left: {
        nodeId: clients.id,
        schema: 'public',
        table: 'clients',
        sourceRef: sourceRef('clients'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      targetNodeId: 'transform',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitJoinDocument(draft)
    );

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[clients, orders, transform]}
          edges={[edge(clients.id), edge(orders.id)]}
          copy={COPY}
        />
      );
    });

    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-source"]')).toHaveLength(
      2
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'JOIN'
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')?.textContent).toContain(
      'Left input'
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inspection"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-viewport"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const zoomIn = container.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')!;
    act(() => {
      zoomIn.click();
      zoomIn.click();
      zoomIn.click();
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).not.toBeNull();
    expect(
      container.querySelectorAll(
        '[data-slot="canvas-relational-semantic-zoom"] [data-slot="canvas-relational-expression-node"]'
      ).length
    ).toBeGreaterThan(1);
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    const zoomOut = container.querySelector<HTMLButtonElement>('button[aria-label="Zoom out"]')!;
    act(() => {
      zoomOut.click();
      zoomOut.click();
      zoomOut.click();
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const tree = container.querySelector('[data-slot="canvas-relational-tree"]');
    const viewport = container.querySelector('[data-slot="canvas-relational-tree-viewport"]')!;
    act(() => {
      viewport.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true })
      );
    });
    expect(container.querySelector('[data-slot="canvas-relational-tree-zoom"]')?.textContent).toBe(
      '120%'
    );
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).not.toBeNull();
    act(() => {
      viewport.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
      );
    });
    expect(container.querySelector('[data-slot="canvas-relational-semantic-zoom"]')).toBeNull();
    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-sources-toggle"]'
    );
    expect(toggle).not.toBeNull();
    act(() => {
      toggle!.click();
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source-list"]')
        ?.hasAttribute('hidden')
    ).toBe(true);
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(tree);
    act(() => {
      toggle!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      );
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    act(() => {
      toggle!.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          repeat: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source-list"]')
        ?.hasAttribute('hidden')
    ).toBe(false);
    expect(container.querySelector('[data-slot="canvas-relational-tree-detail"]')).toBeNull();
    expect(container.textContent).toContain('Orders with clients');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-source"]')?.textContent
    ).not.toContain('Columns: 1');
    act(() =>
      container
        .querySelector<HTMLButtonElement>(
          '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
        )!
        .click()
    );
    expect(
      container.querySelector('[data-slot="canvas-relational-expression-tree"]')?.textContent
    ).toContain('clients.customer_id');
    const expression = container.querySelector('[data-slot="canvas-relational-expression-tree"]')!;
    expect(expression.closest('[role="tabpanel"]')?.getAttribute('data-state')).toBe('active');
    expect(expression.closest('[role="tabpanel"]')?.getAttribute('data-value')).toBe('tree');
    expect(container.querySelector('[data-slot="canvas-operation-properties-tab"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree"]')).toBe(tree);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree"] [title="Columns"]')
    ).toBeNull();

    const source = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-source"]'
    );
    expect(source?.disabled).toBe(false);
    act(() => source?.click());
    expect(source?.getAttribute('aria-pressed')).toBe('true');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-detail"]')?.textContent
    ).toBeUndefined();
    expect(
      Array.from(container.querySelectorAll('[role="treeitem"]')).every(
        (item) => item.tagName === 'BUTTON'
      )
    ).toBe(true);
  });
});
