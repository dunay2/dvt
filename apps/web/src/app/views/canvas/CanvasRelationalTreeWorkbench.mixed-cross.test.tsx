// @vitest-environment jsdom
/** Owned concern: relational workbench mixed-cross behavior. */
import React, { act } from 'react';
import { describe, expect, it } from 'vitest';
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
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
import { openOperationMenu } from './operation-menu/operationMenu.test-support';

describe('Canvas relational-tree Workbench mixed-cross', () => {
  setupWorkbenchTest();
  it('preserves an existing LEFT JOIN when CROSS-composing one pending Source', async () => {
    const customers = sourceNode('customers', 'customers');
    const orders = sourceNode('orders', 'orders');
    const countries = {
      ...sourceNode('countries', 'countries'),
      metadata: {
        ...sourceNode('countries', 'countries').metadata,
        columns: [{ name: 'customer_id', type: 'text' }],
      },
    };
    const leftJoin = createCustomerOrdersJoin({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: sourceRef('customers'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      targetNodeId: 'transform',
      joinType: JoinRel_JoinType.LEFT,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      transformNode(),
      encodeDvtSubstraitSemanticDocument(leftJoin)
    );
    const applied: CanvasInspectorNodeDraft[] = [];

    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={transform}
          nodes={[customers, orders, countries, transform]}
          edges={[edge(customers.id), edge(orders.id), edge(countries.id)]}
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

    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-node-expand"]')
        ?.click()
    );
    const countriesButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((button) => button.textContent?.includes('countries'));
    await act(async () => countriesButton?.click());
    openOperationMenu(container);
    const crossButton = document.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-select-operation-cross-join"]'
    );
    expect(countriesButton?.disabled).toBe(false);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-append-input"]')
    ).not.toBeNull();
    expect(crossButton).not.toBeNull();
    expect(crossButton?.getAttribute('aria-disabled')).toBe('false');
    await act(async () => crossButton?.click());
    const confirmReplacement = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button')
    ).find((button) => button.textContent === COPY.inspectorDvtRelationalApply);
    expect(confirmReplacement).not.toBeNull();
    await act(async () => confirmReplacement?.click());

    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="cross"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(3);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')
        ?.click()
    );
    const semantic = applied[0]?.dvt;
    expect(semantic).toMatchObject({ mode: 'substrait', shape: 'cross_join' });
    if (semantic?.kind !== 'transform' || semantic.mode !== 'substrait') {
      throw new Error('Expected applied Substrait draft.');
    }
    const { index } = deriveSubstraitSchemas(semantic);
    expect(index.relations.get(index.rootId)?.inputs).toHaveLength(2);
    const rootRelation = semantic.plan.relations[0]!.relType;
    if (rootRelation.case !== 'root' || rootRelation.value.input?.relType.case !== 'cross')
      throw new Error('Expected a canonical CROSS root.');
    expect(rootRelation.value.input.relType.value.left).toEqual(
      leftJoin.plan.relations[0]!.relType.case === 'root'
        ? leftJoin.plan.relations[0]!.relType.value.input
        : null
    );
  });
});
