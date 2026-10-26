// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodePropertyTable, type NodePropertyTableProps } from './NodePropertyTable';
import type { NodePropertySection } from './nodePropertiesContracts';

describe('shared property table cells', () => {
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

  it.each([
    ['inspector', 'dvt_fld_01a178aa-43be-733c-b052-afdda1e0985e'],
    ['workbench', 'dvt_fld_01a178aa-43be-733c-b052-afdda1e0985e'],
    ['inspector', 'source-orders.customer_id'],
    ['workbench', 'source-orders.customer_id'],
  ] as const)('keeps column references private in %s (%s)', (surface, reference) => {
    const row = {
      id: 'dvt_fld_private_row_identity',
      cells: {
        name: 'customer_id',
        type: 'integer',
        nullable: 'not null',
        source: 'sales.orders',
        key: 'Primary key',
        default: '0',
        description: 'Business identifier',
        selected: 'Included',
        reference,
      },
    };
    const section: NodePropertySection = {
      id: 'columns',
      label: 'Columns',
      rows: [],
      columnLabels: { reference: 'Referencia' },
      tableRows: [row],
    };
    const original = structuredClone(section);
    const renderTableCell = vi.fn<NonNullable<NodePropertyTableProps['renderTableCell']>>(
      (context) => (context.columnKey === 'description' ? <em>{context.value}</em> : undefined)
    );
    act(() =>
      root.render(
        <NodePropertyTable section={section} surface={surface} renderTableCell={renderTableCell} />
      )
    );

    const labels = [...container.querySelectorAll('th, dt')].map((cell) => cell.textContent);
    expect(labels).not.toContain('reference');
    expect(labels).not.toContain('Referencia');
    const accessible = [...container.querySelectorAll('[title], [aria-label]')]
      .flatMap((element) => [element.getAttribute('title'), element.getAttribute('aria-label')])
      .join(' ');
    expect(`${container.textContent} ${accessible}`).not.toContain(reference);
    expect(`${container.textContent} ${accessible}`).not.toContain(row.id);
    for (const value of Object.entries(row.cells)
      .filter(([key]) => key !== 'reference')
      .map(([, value]) => value)) {
      expect(container.textContent).toContain(value);
    }
    expect(container.querySelector('em')?.textContent).toBe('Business identifier');
    expect(renderTableCell).toHaveBeenCalledWith({
      sectionId: 'columns',
      rowId: row.id,
      columnKey: 'description',
      value: 'Business identifier',
    });
    expect(renderTableCell).not.toHaveBeenCalledWith(
      expect.objectContaining({ columnKey: 'reference' })
    );
    expect(section.tableRows[0]).toBe(row);
    expect(section.tableRows[0]!.cells).toBe(row.cells);
    expect(section).toEqual(original);
  });

  it.each(['inspector', 'workbench'] as const)(
    'preserves actual foreign-key targets in %s',
    (surface) => {
      const section: NodePropertySection = {
        id: 'foreign-keys',
        label: 'Foreign keys',
        rows: [],
        tableRows: [
          {
            id: 'orders_customer_fk',
            cells: {
              columns: 'customer_id',
              referencedTable: 'sales.customers',
              referencedColumns: 'id, tenant_id',
            },
          },
        ],
      };
      const original = structuredClone(section);
      act(() => root.render(<NodePropertyTable section={section} surface={surface} />));
      expect(container.textContent).toContain('customer_id');
      expect(container.textContent).toContain('sales.customers');
      expect(container.textContent).toContain('id, tenant_id');
      expect(section).toEqual(original);
    }
  );

  it.each([
    ['inspector', 'columns'],
    ['workbench', 'columns'],
    ['workbench', 'inputs-outputs'],
    ['workbench', 'indexes'],
  ] as const)('preserves custom cells and empty fallback in %s/%s', (surface, id) => {
    const customKey = id === 'inputs-outputs' ? 'node' : 'description';
    const customValue = id === 'inputs-outputs' ? 'Existing customer' : 'Existing description';
    const renderTableCell = vi.fn<NonNullable<NodePropertyTableProps['renderTableCell']>>(
      (context) => (context.columnKey === customKey ? <button>Edit description</button> : undefined)
    );
    act(() =>
      root.render(
        <NodePropertyTable
          surface={surface}
          renderTableCell={renderTableCell}
          section={{
            id,
            label: 'Fields',
            rows: [],
            columnLabels: { description: 'Description' },
            tableRows: [
              {
                id: 'field-1',
                cells:
                  id === 'inputs-outputs'
                    ? {
                        direction: 'Input',
                        node: customValue,
                        nodeId: 'private-customer-id',
                        relation: '',
                      }
                    : { name: 'customer', description: customValue, nullable: '' },
              },
            ],
          }}
        />
      )
    );
    expect(container.querySelector('button')?.textContent).toBe('Edit description');
    expect(container.textContent).not.toContain(customValue);
    expect(container.textContent).toContain('-');
    expect(renderTableCell).toHaveBeenCalledWith({
      sectionId: id,
      rowId: 'field-1',
      columnKey: customKey,
      value: customValue,
    });
    expect(container.querySelectorAll('button')).toHaveLength(1);
  });
});
