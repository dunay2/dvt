// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SourceImportObjectsMetadata } from './SourceImportObjectsMetadata';
import {
  buildSourceImportTestFileObject,
  buildSourceImportTestObject,
} from './sourceImportWizard.testFixtures';

describe('SourceImportObjectsMetadata', () => {
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

  it('keeps every selected object available and expands the active object independently', async () => {
    const orders = buildSourceImportTestObject({
      selected: true,
      columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
      constraints: [{ name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] }],
    });
    const customers = buildSourceImportTestObject({
      schema: 'CRM',
      table: 'CUSTOMERS',
      selected: true,
      columns: [{ name: 'customer_id', type: 'INTEGER', nullable: false }],
    });

    await act(async () => {
      root.render(
        <SourceImportObjectsMetadata
          sourceObjects={[orders, customers]}
          activeSourceObjectKey={customers.objectId}
          scope="selected"
        />
      );
    });

    expect(container.querySelectorAll('[data-source-import-object-metadata]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-source-import-shared-catalog]')).toHaveLength(1);
    expect(
      container
        .querySelector(`[data-source-import-object-metadata="${customers.objectId}"]`)
        ?.getAttribute('data-state')
    ).toBe('open');
    expect(
      container
        .querySelector(`[data-source-import-object-metadata="${orders.objectId}"]`)
        ?.getAttribute('data-state')
    ).toBe('closed');

    const ordersTrigger = container.querySelector<HTMLButtonElement>(
      `[data-source-import-object-metadata-trigger="${orders.objectId}"]`
    );
    await act(async () => ordersTrigger?.click());

    expect(
      container
        .querySelector(`[data-source-import-object-metadata="${orders.objectId}"]`)
        ?.getAttribute('data-state')
    ).toBe('open');
    expect(
      container
        .querySelector(`[data-source-import-object-metadata="${customers.objectId}"]`)
        ?.getAttribute('data-state')
    ).toBe('open');
    expect(
      container.querySelector('[data-source-import-constraint-marker="primary-key"]')
    ).not.toBeNull();
  });

  it('renders a truthful empty state without inventing an active object', async () => {
    await act(async () => {
      root.render(
        <SourceImportObjectsMetadata
          sourceObjects={[]}
          activeSourceObjectKey={null}
          scope="selected"
        />
      );
    });

    expect(container.querySelector('[data-source-import-metadata-empty]')).not.toBeNull();
    expect(container.querySelector('[data-source-import-object-metadata]')).toBeNull();
  });

  it('keeps selected unsupported objects inspectable without exposing relational columns', async () => {
    const file = buildSourceImportTestFileObject({ selected: true });

    await act(async () => {
      root.render(
        <SourceImportObjectsMetadata
          sourceObjects={[file]}
          activeSourceObjectKey={file.objectId}
          scope="selected"
        />
      );
    });

    expect(
      container.querySelector(`[data-source-import-object-metadata="${file.objectId}"]`)
    ).not.toBeNull();
    expect(container.querySelector('[data-source-import-metadata-column]')).toBeNull();
    expect(container.querySelector('[data-source-import-importability]')).not.toBeNull();
  });
});
