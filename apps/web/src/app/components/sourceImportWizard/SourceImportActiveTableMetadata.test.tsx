// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SourceImportActiveTableMetadata } from './SourceImportActiveTableMetadata';
import { buildSourceImportTestObject } from './sourceImportWizard.testFixtures';
import type { TableInfo } from './types';

function buildTable(overrides?: Partial<TableInfo>): TableInfo {
  return buildSourceImportTestObject({
    columns: [
      { name: 'order_id', type: 'INTEGER', nullable: false },
      { name: 'discount_code', type: 'TEXT', nullable: true },
    ],
    constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
    ...overrides,
  });
}

describe('SourceImportActiveTableMetadata', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders active source identity, metrics, and stable column metadata selectors', async () => {
    await act(async () => {
      root.render(<SourceImportActiveTableMetadata activeTable={buildTable()} />);
    });

    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('2 columns');
    expect(container.textContent).toContain('order_id');
    expect(container.textContent).toContain('Primary key');
    expect(container.textContent).toContain('discount_code');
    expect(container.textContent).toContain('Nullable');

    expect(container.querySelector('[data-source-import-active-table="RAW.ERP.ORDERS"]')).not.toBe(
      null
    );
    expect(
      container.querySelector('[data-source-import-metadata-column="RAW.ERP.ORDERS.order_id"]')
    ).not.toBe(null);
    expect(
      container.querySelector('[data-source-import-metadata-column="RAW.ERP.ORDERS.discount_code"]')
    ).not.toBe(null);
  });
});
