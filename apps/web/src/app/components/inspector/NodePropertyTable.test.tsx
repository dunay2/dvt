// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NodePropertyTable, type NodePropertyTableProps } from './NodePropertyTable';

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
    ['inspector', 'columns'],
    ['workbench', 'columns'],
    ['workbench', 'inputs-outputs'],
    ['workbench', 'indexes'],
  ] as const)('preserves custom cells and empty fallback in %s/%s', (surface, id) => {
    const renderTableCell = vi.fn<NonNullable<NodePropertyTableProps['renderTableCell']>>(
      (context) =>
        context.columnKey === 'description' ? <button>Edit description</button> : undefined
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
                cells: { name: 'customer', description: 'Existing description', nullable: '' },
              },
            ],
          }}
        />
      )
    );
    expect(container.querySelector('button')?.textContent).toBe('Edit description');
    expect(container.textContent).not.toContain('Existing description');
    expect(container.textContent).toContain('-');
    expect(renderTableCell).toHaveBeenCalledWith({
      sectionId: id,
      rowId: 'field-1',
      columnKey: 'description',
      value: 'Existing description',
    });
    expect(
      renderTableCell.mock.calls.filter(([context]) => context.columnKey === 'description')
    ).toHaveLength(1);
  });
});
