// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasViewCopy } from './copy';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';
import { describe, expect, it, vi } from 'vitest';
import {
  input,
  useCompositionStartHarness,
} from './DvtSubstraitCompositionStartSection.test-support';
describe('Composition start proposal', () => {
  const view = useCompositionStartHarness();
  it('keeps the operation explicit while carrying a cross-input field proposal into JOIN', async () => {
    const onStartInnerJoin = vi.fn();
    const onClearPredicateSeed = vi.fn();
    const orders: CanvasDvtCompositionInput = {
      ...input('orders', 'orders'),
      fields: [
        { name: 'id', dataType: 'text', joinDataType: 'string' },
        { name: 'customer_id', dataType: 'text', joinDataType: 'string' },
      ],
    };
    const customers: CanvasDvtCompositionInput = {
      ...input('customers', 'customers'),
      fields: [
        { name: 'id', dataType: 'text', joinDataType: 'string' },
        { name: 'customer_id', dataType: 'text', joinDataType: 'string' },
      ],
    };
    const shipments = input('shipments', 'shipments');

    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[orders, customers, shipments]}
          predicateSeed={{
            targetNodeId: 'model-1',
            left: {
              nodeId: 'orders',
              fieldId: 'orders-customer-id',
              fieldName: 'customer_id',
              dataType: 'string',
            },
            right: {
              nodeId: 'customers',
              fieldId: 'customers-customer-id',
              fieldName: 'customer_id',
              dataType: 'string',
            },
            candidateOperator: 'equal',
          }}
          onClearPredicateSeed={onClearPredicateSeed}
          onStartInnerJoin={onStartInnerJoin}
        />
      );
    });

    expect(
      view.container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(
      view.container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')?.textContent
    ).toContain('orders.customer_id = customers.customer_id');
    expect(
      view.container.querySelector('[data-slot="dvt-select-operation-inner-join"]')?.textContent
    ).toContain(canvasViewCopy.inspectorDvtRelationalAvailable);
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });

    expect(
      view.container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-left-input"]')
        ?.value
    ).toBe('orders');
    expect(
      view.container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-right-input"]')
        ?.value
    ).toBe('customers');
    expect(
      view.container.querySelector('[data-slot="semantic-workbench-join-condition-row"]')
        ?.textContent
    ).toContain('orders · 1.customer_id = customers · 2.customer_id');

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-cancel-relational-operation"]'
        )!
      );
    });
    expect(onClearPredicateSeed).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });
  it('does not advertise a stale predicate proposal as available', async () => {
    await act(async () => {
      view.root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          predicateSeed={{
            targetNodeId: 'model-1',
            left: {
              nodeId: 'orders',
              fieldId: 'orders-id',
              fieldName: 'id',
              dataType: 'string',
            },
            right: {
              nodeId: 'customers',
              fieldId: 'customers-removed',
              fieldName: 'removed',
              dataType: 'string',
            },
            candidateOperator: 'equal',
          }}
          onStartInnerJoin={vi.fn()}
        />
      );
    });

    expect(
      view.container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')
    ).toBeNull();
    expect(
      view.container.querySelector('[data-slot="dvt-select-operation-inner-join"]')?.textContent
    ).toContain(canvasViewCopy.inspectorDvtRelationalNeedsPredicate);
  });
});
