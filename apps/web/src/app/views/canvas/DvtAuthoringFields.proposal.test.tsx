// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
describe('DVT composition proposal', () => {
  const view = useAuthoringFieldsHarness();

  it('applies an explicit JOIN from a cross-input field relation proposal', async () => {
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['id', 'customer_id'],
    });
    const customers = buildJoinWarehouseSourceNode({
      id: 'source-customers',
      table: 'customers',
      columns: ['id', 'customer_id'],
    });
    const transform = buildDvtNode('dvt:transform');
    const onClearRelationalPredicateSeed = vi.fn();
    view.renderFields(
      transform,
      undefined,
      undefined,
      [orders, customers, transform],
      [
        {
          id: 'orders-transform',
          sourceId: orders.id,
          targetId: transform.id,
          relation: 'lineage',
        },
        {
          id: 'customers-transform',
          sourceId: customers.id,
          targetId: transform.id,
          relation: 'lineage',
        },
      ],
      'code',
      {
        targetNodeId: transform.id,
        left: {
          nodeId: orders.id,
          fieldId: 'orders-customer-id',
          fieldName: 'customer_id',
          dataType: 'string',
        },
        right: {
          nodeId: customers.id,
          fieldId: 'customers-customer-id',
          fieldName: 'customer_id',
          dataType: 'string',
        },
        candidateOperator: 'equal',
      },
      onClearRelationalPredicateSeed
    );

    expect(
      view.container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')
    ).not.toBeNull();
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-select-operation-inner-join"]'
        )!
      );
    });
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-start-configured-inner-join"]'
        )!
      );
    });

    expect(view.draftJson()).toContain('"shape":"inner_join"');
    expect(onClearRelationalPredicateSeed).toHaveBeenCalledOnce();
  });
});
