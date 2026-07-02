// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  buildWarehouseTable,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';

describe('SourceImportWizard metadata exploration', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('uses contextual tabs to inspect source metadata without leaving the add-source surface', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseTables: async () => [
          buildWarehouseTable({
            table: 'ORDERS',
            rowCount: 1500,
            columns: [
              { name: 'order_id', type: 'INTEGER', nullable: false, primaryKey: true },
              { name: 'customer_id', type: 'INTEGER', nullable: false },
              { name: 'discount_code', type: 'TEXT', nullable: true, unique: true },
            ],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');
    await harness.clickClickableDivByText('ORDERS');
    await harness.clickTab('Metadata');

    expect(harness.findTab('Metadata')?.getAttribute('aria-selected')).toBe('true');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('1,500 rows');
    expect(document.body.textContent).toContain('3 columns');
    expect(document.body.textContent).toContain('order_id');
    expect(document.body.textContent).toContain('INTEGER');
    expect(document.body.textContent).toContain('Primary key');
    expect(document.body.textContent).toContain('Required');
    expect(document.body.textContent).toContain('discount_code');
    expect(document.body.textContent).toContain('Unique');
    expect(document.body.textContent).toContain('Nullable');
    expect(document.body.textContent).toContain('Metadata Options');

    const metadataText = document.body.textContent ?? '';
    expect(metadataText.indexOf('Metadata Options')).toBeLessThan(
      metadataText.indexOf('Source metadata')
    );
    expect(metadataText.indexOf('Metadata Options')).toBeLessThan(
      metadataText.indexOf('Grouping Strategy')
    );
  });

  it('opens at the selected warehouse tables when launched from the source explorer', async () => {
    await harness.renderWizard({
      initialSelection: {
        connectionId: 'conn-1',
        tables: [
          buildWarehouseTable({
            table: 'CUSTOMERS',
            rowCount: 45000,
            columns: [
              { name: 'customer_id', type: 'NUMBER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true },
            ],
          }),
        ],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseTables: async () => [
          buildWarehouseTable({ table: 'ORDERS' }),
          buildWarehouseTable({
            table: 'CUSTOMERS',
            rowCount: 45000,
            columns: [
              { name: 'customer_id', type: 'NUMBER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true },
            ],
          }),
        ],
      }),
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Browse source tables');
    expect(document.body.textContent).toContain('CUSTOMERS');
    expect(document.body.textContent).toContain('Selected: 1');
    expect(document.body.textContent).toContain('RAW.ERP.CUSTOMERS');
    expect(document.body.textContent).toContain('45,000 rows');
    expect(document.body.textContent).toContain('customer_id');
    expect(document.body.textContent).toContain('NUMBER');
    expect(document.body.textContent).toContain('Required');
    expect(document.body.textContent).toContain('email');
    expect(document.body.textContent).toContain('Nullable');
    expect(document.body.textContent).toContain('Destination is configured on a DVT Sink node');
  });

  it('does not carry explorer preselection into a different warehouse connection', async () => {
    const listWarehouseTables = vi.fn(async () => [buildWarehouseTable({ table: 'CUSTOMERS' })]);

    await harness.renderWizard({
      initialSelection: {
        connectionId: 'conn-1',
        tables: [buildWarehouseTable({ table: 'CUSTOMERS' })],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [
          {
            id: 'conn-1',
            name: 'Snowflake PROD',
            type: 'snowflake',
            database: 'RAW',
          },
          {
            id: 'conn-2',
            name: 'Snowflake QA',
            type: 'snowflake',
            database: 'RAW',
          },
        ],
        listWarehouseTables,
      }),
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Selected: 1');

    await harness.clickTab('Connections');
    await harness.clickConnectionOption('Snowflake QA');
    await harness.clickTab('Browse');
    await harness.flushPendingWork();

    expect(listWarehouseTables).toHaveBeenLastCalledWith('conn-2');
    expect(document.body.textContent).toContain('Selected: 0');
  });

  it('explores governed database connections with search before table discovery', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [
          {
            id: 'warehouse-prod',
            name: 'Production warehouse',
            type: 'postgres',
            database: 'analytics',
          },
          {
            id: 'warehouse-sandbox',
            name: 'Sandbox warehouse',
            type: 'postgres',
            database: 'sandbox',
          },
        ],
      }),
    });

    const search = document.querySelector<HTMLInputElement>(
      '[data-slot="source-import-connection-search"]'
    );

    expect(search).not.toBeNull();
    expect(document.body.textContent).toContain('2 connections in governed catalog');
    expect(document.body.textContent).toContain('Production warehouse');
    expect(document.body.textContent).toContain('Sandbox warehouse');

    await act(async () => {
      if (search) {
        fireEvent.change(search, { target: { value: 'prod' } });
      }
    });

    expect(document.body.textContent).toContain('Production warehouse');
    expect(document.body.textContent).not.toContain('Sandbox warehouse');
  });

  it('searches source tables by column metadata and keeps the active metadata visible while browsing', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseTables: async () => [
          buildWarehouseTable({
            table: 'ORDERS',
            rowCount: 1500,
            columns: [
              { name: 'order_id', type: 'INTEGER', nullable: false },
              { name: 'customer_id', type: 'INTEGER', nullable: false },
            ],
          }),
          buildWarehouseTable({
            table: 'CUSTOMERS',
            rowCount: 45000,
            byteSize: 7340032,
            columns: [
              { name: 'customer_id', type: 'INTEGER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true, unique: true },
            ],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Snowflake PROD');
    await harness.clickTab('Browse');

    const search = document.querySelector<HTMLInputElement>(
      '[data-slot="source-import-table-search"]'
    );

    expect(search).not.toBeNull();
    expect(document.body.textContent).toContain('2 tables available');
    expect(document.body.textContent).toContain('Source metadata');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');

    await act(async () => {
      if (search) {
        fireEvent.change(search, { target: { value: 'email' } });
      }
    });

    expect(document.body.textContent).toContain('Showing 1 of 2 tables');
    expect(document.body.textContent).toContain('CUSTOMERS');
    expect(document.body.textContent).not.toContain('ORDERS');
    expect(document.body.textContent).toContain('RAW.ERP.CUSTOMERS');
    expect(document.body.textContent).toContain('45,000 rows');
    expect(document.body.textContent).toContain('7 MB');
    expect(document.body.textContent).toContain('email');
    expect(document.body.textContent).toContain('VARCHAR');
    expect(document.body.textContent).toContain('Unique');
  });
});
