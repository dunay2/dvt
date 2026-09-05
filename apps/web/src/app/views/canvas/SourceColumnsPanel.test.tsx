// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { NodePropertiesReadModel } from '../../components/inspector/nodePropertiesReadModel';
import { SourceColumnsPanel } from './SourceColumnsPanel';

const readModel: NodePropertiesReadModel = {
  nodeId: 'source-1',
  nodeName: 'Orders Source',
  sections: [
    {
      id: 'columns',
      label: 'Columns',
      rows: [],
      tableRows: [
        {
          id: 'order_id',
          cells: {
            name: 'order_id',
            type: 'uuid',
            nullable: 'not null',
            key: 'PK',
            default: 'gen_random_uuid()',
            comment: 'Stable order identifier',
          },
        },
        {
          id: 'customer_id',
          cells: {
            name: 'customer_id',
            type: 'bigint',
            nullable: 'not null',
            key: '',
            default: '',
            comment: 'Owning customer',
          },
        },
        {
          id: 'metadata',
          cells: {
            name: 'metadata',
            type: 'jsonb',
            nullable: 'nullable',
            key: '',
            default: '',
            comment: '',
          },
        },
      ],
    },
    {
      id: 'keys',
      label: 'Keys',
      rows: [],
      tableRows: [],
    },
    {
      id: 'indexes',
      label: 'Indexes',
      rows: [],
      tableRows: [
        {
          id: 'idx_orders_customer',
          cells: {
            name: 'idx_orders_customer',
            type: 'btree',
            columns: 'customer_id',
            unique: 'no',
          },
        },
      ],
    },
    {
      id: 'foreign-keys',
      label: 'Foreign keys',
      rows: [],
      tableRows: [
        {
          id: 'orders_customer_fk',
          cells: {
            name: 'orders_customer_fk',
            localColumns: 'customer_id',
            referencedTable: 'crm.customers',
            referencedColumns: 'id',
          },
        },
      ],
    },
  ],
};

describe('SourceColumnsPanel', () => {
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

  it('renders single-line typed rows with non-redundant authoritative badges', () => {
    act(() => root.render(<SourceColumnsPanel readModel={readModel} />));

    const rows = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-slot="canvas-source-column-row"]')
    );
    const orderRow = rows.find((row) => row.dataset.columnId === 'order_id');
    const customerRow = rows.find((row) => row.dataset.columnId === 'customer_id');
    const metadataRow = rows.find((row) => row.dataset.columnId === 'metadata');

    expect(rows).toHaveLength(3);
    expect(orderRow?.textContent).toContain('U');
    expect(orderRow?.textContent).toContain('order_id');
    expect(orderRow?.textContent).toContain('PK');
    expect(orderRow?.textContent).not.toContain('NN');
    expect(orderRow?.textContent).not.toContain('uuid');

    expect(customerRow?.textContent).toContain('#');
    expect(customerRow?.textContent).toContain('FK');
    expect(customerRow?.textContent).toContain('IDX');
    expect(customerRow?.textContent).toContain('NN');
    expect(customerRow?.textContent).not.toContain('bigint');

    expect(metadataRow?.textContent).toContain('{}');
    expect(metadataRow?.textContent).not.toContain('NN');
    expect(orderRow?.getAttribute('aria-pressed')).toBe('true');
    expect(orderRow?.querySelector('[data-slot="canvas-source-column-selected-marker"]')).not.toBeNull();
  });

  it('searches and filters with real behavior and keeps detail aligned to visible selection', () => {
    act(() => root.render(<SourceColumnsPanel readModel={readModel} />));

    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    const filter = container.querySelector<HTMLSelectElement>('#source-columns-filter')!;

    act(() => fireEvent.input(search, { target: { value: 'customer' } }));
    expect(container.querySelectorAll('[data-slot="canvas-source-column-row"]')).toHaveLength(1);
    expect(container.textContent).toContain('customer_id');

    const detail = container.querySelector('[data-slot="canvas-source-column-detail"]');
    expect(detail?.textContent).toContain('bigint');
    expect(detail?.textContent).toContain('crm.customers.id');
    expect(detail?.textContent).toContain('idx_orders_customer');
    expect(detail?.textContent).toContain('Owning customer');

    act(() => fireEvent.input(search, { target: { value: '' } }));
    act(() => fireEvent.change(filter, { target: { value: 'nullable' } }));

    const visibleRows = container.querySelectorAll('[data-slot="canvas-source-column-row"]');
    expect(visibleRows).toHaveLength(1);
    expect(visibleRows[0]?.textContent).toContain('metadata');
    expect(detail?.textContent).toContain('jsonb');
    expect(detail?.textContent).toContain('Nullable');
  });

  it('does not render persistence banners or unsupported DVT annotations', () => {
    act(() => root.render(<SourceColumnsPanel readModel={readModel} />));

    expect(container.textContent).not.toContain('Save failed');
    expect(container.textContent).not.toContain('Retry');
    expect(container.textContent).not.toContain('Add comment');
    expect(container.textContent).not.toContain('DVT comments');
  });
});
