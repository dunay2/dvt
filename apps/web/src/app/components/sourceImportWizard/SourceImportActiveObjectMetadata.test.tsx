// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SourceImportActiveObjectMetadata } from './SourceImportActiveObjectMetadata';
import {
  buildSourceImportTestFileObject,
  buildSourceImportTestObject,
} from './sourceImportWizard.testFixtures';

describe('SourceImportActiveObjectMetadata', () => {
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

  it('renders governed metrics and column semantics for the active relation', async () => {
    const relation = buildSourceImportTestObject({
      columns: [
        { name: 'order_id', type: 'INTEGER', nullable: false },
        { name: 'discount_code', type: 'TEXT', nullable: true },
      ],
      constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
    });

    await act(async () => {
      root.render(<SourceImportActiveObjectMetadata activeSourceObject={relation} />);
    });

    expect(container.textContent).toContain('RAW.ERP.ORDERS');
    expect(container.textContent).toContain('1,500 rows');
    expect(container.textContent).toContain('3.9 MB');
    expect(container.textContent).toContain('2 columns');
    expect(container.textContent).toContain('PK');
    expect(container.textContent).not.toContain('Primary key');
    expect(container.textContent).not.toContain('Nullable');
    expect(
      container.querySelector(
        '[data-source-import-constraint-marker="primary-key"][aria-label="Primary key"]'
      )
    ).not.toBeNull();
    expect(
      container.querySelector(`[data-source-import-active-object="${relation.objectId}"]`)
    ).not.toBeNull();
    expect(
      container.querySelector('[data-source-import-metadata-column="RAW.ERP.ORDERS.order_id"]')
    ).not.toBeNull();
    expect(
      container
        .querySelector('[data-source-import-metadata-column="RAW.ERP.ORDERS.discount_code"]')
        ?.querySelector('[data-source-import-constraint-marker]')
    ).toBeNull();
  });

  it('inspects a non-relational object while explaining why it cannot be attached yet', async () => {
    const file = buildSourceImportTestFileObject();

    await act(async () => {
      root.render(<SourceImportActiveObjectMetadata activeSourceObject={file} />);
    });

    expect(container.textContent).toContain('/landing/orders.parquet');
    expect(container.textContent).toContain('Files');
    expect(container.textContent).toContain(
      'Visible for inspection. This importer currently attaches relational source objects only.'
    );
  });
});
