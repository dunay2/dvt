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
  sourceRef,
  transformNode,
  edge,
  root,
  container,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  connectWorkbenchSource,
  appendWorkbenchJoin,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { createSourceJoin } from './canvasSourceJoin';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

describe('Canvas relational-tree Workbench join-chain', () => {
  setupWorkbenchTest();
  it('chains every connected Source and keeps earlier Source fields available to later JOINs', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = sourceNode('countries', 'countries');
    const regions = sourceNode('regions', 'regions');
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(
        createSourceJoin({
          targetNodeId: 'transform',
          left: {
            source: {
              nodeId: customers.id,
              schema: 'public',
              table: 'customers',
              sourceRef: sourceRef('customers'),
            },
            fields: ['customers_id'],
          },
          right: {
            source: {
              nodeId: orders.id,
              schema: 'public',
              table: 'orders',
              sourceRef: sourceRef('orders'),
            },
            fields: ['orders_id'],
          },
          leftFieldName: 'customers_id',
          rightFieldName: 'orders_id',
        })
      )
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
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
    // Initial JOIN creation is covered by the apply test; this case owns chaining.
    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);

    await connectWorkbenchSource(sourceButtons[2]!);
    const existingFieldOptions = Array.from(
      container.querySelectorAll<HTMLOptionElement>(
        '[data-slot="canvas-relational-tree-existing-field"] option'
      )
    ).map((option) => option.textContent);
    expect(existingFieldOptions).toContain('customers_id');
    expect(existingFieldOptions).toContain('orders_id');
    await appendWorkbenchJoin();

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);

    await connectWorkbenchSource(sourceButtons[3]!);
    await appendWorkbenchJoin();

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-slot="canvas-relational-tree-output"]')).toHaveLength(
      1
    );
    expect(applied).toHaveLength(0);

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    expect(applied).toHaveLength(1);
  });
});
