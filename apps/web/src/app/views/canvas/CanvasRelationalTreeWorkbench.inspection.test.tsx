// @vitest-environment jsdom
/** Owned concern: relational workbench inspection behavior. */
import React, { act } from 'react';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
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

const TREE = '[data-slot="canvas-relational-tree"]';
const SOURCE = '[data-slot="canvas-relational-tree-source"]';
const DETAIL = '[data-slot="canvas-relational-tree-detail"]';

function requireElement<T extends Element>(selector: string): T {
  const element = container.querySelector<T>(selector);
  assert(element, `Missing ${selector}`);
  return element;
}

function sourceExplorer(): Element {
  const panel = requireElement('[data-slot="canvas-relational-tree-source-list"]').closest(
    '[data-slot="canvas-explorer-panel"]'
  );
  assert(panel, 'The Source list must belong to the Explorer panel');
  return panel;
}

async function renderJoin(): Promise<void> {
  const clients = sourceNode('clients', 'clients');
  const orders = sourceNode('orders', 'orders');
  const draft = createCustomerOrdersJoin({
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
    encodeDvtSubstraitSemanticDocument(draft)
  );
  await act(async () => {
    root.render(
      <CanvasRelationalTreeWorkbench
        transformNode={transform}
        nodes={[clients, orders, transform]}
        edges={[edge(clients.id), edge(orders.id)]}
        copy={COPY}
      />
    );
  });
}

describe('Canvas relational-tree Workbench inspection', () => {
  setupWorkbenchTest();
  beforeEach(renderJoin);

  it('renders the existing JOIN as an inspection surface without authoring or detail panels', () => {
    expect(container.querySelectorAll(SOURCE)).toHaveLength(2);
    const tree = requireElement(TREE);
    expect(tree.textContent).toContain('JOIN');
    expect(tree.textContent).toContain('Left input');
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-inspection"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-viewport"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-start-authoring"]')
    ).toBeNull();
    expect(container.querySelector(DETAIL)).toBeNull();
    expect(container.textContent).toContain('Orders with clients');
    expect(requireElement(SOURCE).textContent).not.toContain('Columns: 1');
  });

  it('toggles the Source Explorer without remounting the tree and ignores repeated Enter', async () => {
    const tree = requireElement(TREE);
    const toggle = requireElement<HTMLButtonElement>(
      '[data-slot="canvas-explorer-elements-toggle"]'
    );

    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sourceExplorer().hasAttribute('hidden')).toBe(true);
    expect(container.querySelector(TREE)).toBe(tree);

    await act(async () => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await act(async () => {
      toggle.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          repeat: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sourceExplorer().hasAttribute('hidden')).toBe(false);
    expect(container.querySelector(TREE)).toBe(tree);
    expect(container.querySelector(DETAIL)).toBeNull();
  });

  it('shows JOIN conditions in Properties and keeps Source selection interactive', async () => {
    const tree = requireElement(TREE);
    const join = requireElement<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-node"][data-operator="join"]'
    );
    await act(async () => join.click());

    expect(requireElement('[data-slot="canvas-relational-expression-tree"]').textContent).toContain(
      'clients.customer_id'
    );
    const expression = requireElement(
      '[role="tabpanel"][data-state="active"] [data-slot="semantic-workbench-join-condition-row"]'
    );
    expect(expression.textContent).toContain('clients.customer_id');
    const panel = expression.closest('[role="tabpanel"]');
    expect(panel?.getAttribute('data-state')).toBe('active');
    expect(panel?.getAttribute('data-value')).toBe('properties');
    expect(container.querySelector('[data-slot="canvas-operation-properties-tab"]')).not.toBeNull();
    expect(container.querySelector(TREE)).toBe(tree);
    expect(tree.querySelector('[title="Columns"]')).toBeNull();

    const source = requireElement<HTMLButtonElement>(SOURCE);
    expect(source.disabled).toBe(false);
    await act(async () => source.click());
    expect(source.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector(DETAIL)).toBeNull();
    expect(
      Array.from(container.querySelectorAll('[role="treeitem"]')).every(
        (item) => item.tagName === 'BUTTON'
      )
    ).toBe(true);
  });
});
