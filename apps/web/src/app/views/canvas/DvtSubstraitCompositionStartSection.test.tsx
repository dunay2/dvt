// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { canvasViewCopy } from './copy';
import { DvtSubstraitCompositionStartSection } from './DvtSubstraitCompositionStartSection';

function input(nodeId: string, table: string): CanvasDvtCompositionInput {
  return {
    nodeId,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse-main',
      },
      sourceObjectId: `raw.${table}`,
    },
    fields: [{ name: 'id', dataType: 'text', stringCompatible: true }],
  };
}

function inputOnConnection(
  nodeId: string,
  table: string,
  provider: 'postgres' | 'snowflake',
  connectionId: string
): CanvasDvtCompositionInput {
  const value = input(nodeId, table);
  return {
    ...value,
    sourceRef: {
      ...value.sourceRef,
      connectionRef: { ...value.sourceRef.connectionRef, provider, connectionId },
    },
  };
}

describe('DvtSubstraitCompositionStartSection', () => {
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

  it('separates operation choice from predicate authoring and explicit apply', () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('orders', 'orders'), input('customers', 'customers')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartUnionAll={onStartUnionAll}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-composition-left-field"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    expect(container.querySelector('[data-slot="dvt-composition-left-field"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-composition-right-field"]')).not.toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-cancel-relational-operation"]')!
      );
    });
    expect(container.querySelector('[data-slot="dvt-composition-left-field"]')).toBeNull();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
    expect(onStartUnionAll).not.toHaveBeenCalled();
  });

  it('applies UNION ALL without manufacturing a field predicate', () => {
    const onStartInnerJoin = vi.fn();
    const onStartUnionAll = vi.fn();
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[input('north', 'customers_north'), input('south', 'customers_south')]}
          onStartInnerJoin={onStartInnerJoin}
          onStartUnionAll={onStartUnionAll}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-union-all"]')!
      );
    });
    expect(container.querySelector('[data-slot="dvt-composition-left-field"]')).toBeNull();
    expect(onStartUnionAll).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-connected-union-all"]')!
      );
    });
    expect(onStartUnionAll).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });

  it('opens a valid PostgreSQL pair when an earlier N-input candidate is target-incompatible', () => {
    act(() => {
      root.render(
        <DvtSubstraitCompositionStartSection
          disabled={false}
          inputs={[
            inputOnConnection('external', 'external', 'snowflake', 'external'),
            inputOnConnection('orders', 'orders', 'postgres', 'warehouse-main'),
            inputOnConnection('customers', 'customers', 'postgres', 'warehouse-main'),
          ]}
          onStartInnerJoin={vi.fn()}
        />
      );
    });

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    const left = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-field"]'
    );
    const right = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-field"]'
    );
    expect(left?.value).toContain('orders');
    expect(right?.value).toContain('customers');
    expect(left?.textContent).not.toContain('external');
  });

  it('keeps the operation explicit while carrying a cross-input field proposal into JOIN', () => {
    const onStartInnerJoin = vi.fn();
    const onClearPredicateSeed = vi.fn();
    const orders = {
      ...input('orders', 'orders'),
      fields: [
        { name: 'id', dataType: 'text', stringCompatible: true },
        { name: 'customer_id', dataType: 'text', stringCompatible: true },
      ],
    };
    const customers = {
      ...input('customers', 'customers'),
      fields: [
        { name: 'id', dataType: 'text', stringCompatible: true },
        { name: 'customer_id', dataType: 'text', stringCompatible: true },
      ],
    };
    const shipments = input('shipments', 'shipments');

    act(() => {
      root.render(
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
      container.querySelector('[data-slot="dvt-relational-operation-chooser"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="dvt-relational-predicate-proposal"]')?.textContent
    ).toContain('orders.customer_id = customers.customer_id');
    expect(
      container.querySelector('[data-slot="dvt-select-operation-inner-join"]')?.textContent
    ).toContain(canvasViewCopy.inspectorDvtRelationalAvailable);
    expect(onStartInnerJoin).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-select-operation-inner-join"]')!
      );
    });

    expect(
      container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-left-field"]')?.value
    ).toContain('orders\u001fcustomer_id');
    expect(
      container.querySelector<HTMLSelectElement>('[data-slot="dvt-composition-right-field"]')?.value
    ).toContain('customers\u001fcustomer_id');

    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-cancel-relational-operation"]')!
      );
    });
    expect(onClearPredicateSeed).toHaveBeenCalledOnce();
    expect(onStartInnerJoin).not.toHaveBeenCalled();
  });
});
