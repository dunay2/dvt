// @vitest-environment jsdom
/** Owned concern: relational workbench join-chain behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import {
  setupWorkbenchTest,
  COPY,
  sourceNode,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

describe('Canvas relational-tree Workbench join-chain', () => {
  setupWorkbenchTest();
  it('chains every connected Source and keeps earlier Source fields available to later JOINs', () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = sourceNode('countries', 'countries');
    const regions = sourceNode('regions', 'regions');
    const transform = transformNode();
    const applied: CanvasInspectorNodeDraft[] = [];

    act(() => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, regions, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id), edge(regions.id)]}
          copy={COPY}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: (_nodeId, draft) => {
              applied.push(draft);
              return { outcome: 'no_changes' };
            },
          }}
        />
      );
    });

    const sourceButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    );
    act(() => sourceButtons[0]?.click());
    act(() => sourceButtons[1]?.click());
    openOperationMenu(container);
    act(() =>
      document
        .querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    act(() => sourceButtons[2]?.click());
    const existingFieldOptions = Array.from(
      container.querySelectorAll<HTMLOptionElement>(
        '[data-slot="canvas-relational-tree-existing-field"] option'
      )
    ).map((option) => option.textContent);
    expect(existingFieldOptions).toContain('customers.customers_id');
    expect(existingFieldOptions).toContain('orders.orders_id');
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);

    const joinCards = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-operator="join"]')
    );
    const visiblePredicates = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-slot="dvt-substrait-join-predicate-editors"] fieldset'
        )
      ).filter((fieldset) => !fieldset.hidden);
    act(() => joinCards[1]!.click());
    expect(visiblePredicates()).toHaveLength(1);
    expect(visiblePredicates()[0]?.textContent).toContain('orders.orders_id');
    expect(visiblePredicates()[0]?.textContent).not.toContain('countries.countries_id');
    act(() =>
      visiblePredicates()[0]!
        .querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
        .click()
    );
    const pendingEditor = visiblePredicates()[0]!.querySelector(
      '[data-slot="semantic-workbench-join-condition-editor"]'
    );
    act(() => {
      const comparison = pendingEditor!.querySelector<HTMLSelectElement>(
        '[aria-label="Comparador de la condición"]'
      )!;
      comparison.value = 'not_equal';
      comparison.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => joinCards[0]!.click());
    expect(visiblePredicates()).toHaveLength(1);
    expect(visiblePredicates()[0]?.textContent).toContain('countries.countries_id');
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.disabled
    ).toBe(true);
    act(() => joinCards[1]!.click());
    expect(
      visiblePredicates()[0]!.querySelector(
        '[data-slot="semantic-workbench-join-condition-editor"]'
      )
    ).toBe(pendingEditor);
    act(() =>
      visiblePredicates()[0]!
        .querySelector<HTMLButtonElement>('[aria-label="Cerrar editor"]')!
        .click()
    );
    expect(applied).toHaveLength(0);

    act(() => sourceButtons[3]?.click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-append-input"]')
        ?.click()
    );

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-output"]')).toHaveLength(
      1
    );
    expect(applied).toHaveLength(0);

    act(() =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
  });
});
