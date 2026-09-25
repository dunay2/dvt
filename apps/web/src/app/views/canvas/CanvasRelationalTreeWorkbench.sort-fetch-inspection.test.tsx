// @vitest-environment jsdom
/** Owned concern: inspect applied ordering and limits without routing them to JOIN predicates. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSort,
  applyDvtSubstraitFetch,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasSortFetch.test-support';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
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

describe('applied Sort/Fetch inspection', () => {
  setupWorkbenchTest();

  it.each(
    (['sort', 'fetch'] as const).flatMap((operation) =>
      [false, true].map((editable) => ({ operation, editable }))
    )
  )(
    'opens $operation properties without a predicate tree (editable: $editable)',
    async ({ operation, editable }) => {
      const clients = sourceNode('clients', 'clients');
      const orders = sourceNode('orders', 'orders');
      const joined = createCustomerOrdersJoin({
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
      const field = resolveDvtSubstraitSortFetchInputFields(joined)[0]!;
      const sorted = applyDvtSubstraitSort(joined, [
        { fieldId: field.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
      ]);
      const fetched = applyDvtSubstraitFetch(sorted, {
        count: 100n,
        offset: 2n,
      });
      const base = applyDvtSubstraitSemanticDocument(
        transformNode(),
        encodeDvtSubstraitSemanticDocument(joined)
      );
      const metadata = createDvtTransformAuthoringMetadata(base);
      if (metadata.mode === 'uninitialized') throw new Error('Expected canonical JOIN');
      const transform = applyDvtTransformAuthoringMetadata(base, {
        ...metadata,
        plan: fetched.plan,
        sidecar: fetched.sidecar,
      });

      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={transform}
            nodes={[clients, orders, transform]}
            edges={[edge(clients.id), edge(orders.id)]}
            copy={COPY}
            authoring={
              editable
                ? { canEditNode: true, onApplyNodeDraft: () => ({ outcome: 'no_changes' }) }
                : undefined
            }
          />
        );
      });
      await act(async () => {
        container
          .querySelector<HTMLButtonElement>(
            `[data-slot="canvas-relational-tree-node"][data-operator="${operation}"]`
          )!
          .click();
      });

      const properties = container.querySelector(
        '[data-slot="canvas-relational-tree-inline-editor"]'
      );
      expect(properties).not.toBeNull();
      if (!editable)
        expect(properties!.textContent).toContain(
          operation === 'sort' ? `${field.name} DESC NULLS LAST` : 'LIMIT 100 · OFFSET 2'
        );
      expect(
        properties!
          .querySelector('[data-slot="canvas-operation-properties-tab"]')
          ?.getAttribute('data-state')
      ).toBe('active');
      expect(properties!.querySelector('[data-slot="canvas-operation-tree-tab"]')).toBeNull();
      expect(
        properties!.querySelector('[data-slot="canvas-relational-expression-tree"]')
      ).toBeNull();
      expect(properties!.querySelector('form') != null).toBe(editable);
    }
  );
});
