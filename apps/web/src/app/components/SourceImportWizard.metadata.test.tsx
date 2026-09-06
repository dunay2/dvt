// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildWarehouseSourceImportPort,
  buildSourceObject,
  createSourceImportWizardHarness,
} from './SourceImportWizard.testHarness';
import { buildSourceImportTestMetricEvidence } from './sourceImportWizard/sourceImportWizard.testFixtures';

describe('SourceImportWizard metadata exploration', () => {
  let harness: ReturnType<typeof createSourceImportWizardHarness>;

  beforeEach(() => {
    harness = createSourceImportWizardHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('uses contextual tabs to inspect source metadata without leaving the add-source surface', async () => {
    const orders = buildSourceObject({
      table: 'ORDERS',
      metricEvidence: buildSourceImportTestMetricEvidence(1500, 4096000),
      columns: [
        { name: 'order_id', type: 'INTEGER', nullable: false },
        { name: 'customer_id', type: 'INTEGER', nullable: false },
        { name: 'discount_code', type: 'TEXT', nullable: true },
      ],
      constraints: [
        { name: 'orders_pkey', kind: 'primary-key', columns: ['order_id'] },
        { name: 'orders_discount_code_key', kind: 'unique', columns: ['discount_code'] },
      ],
    });
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [orders],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectInspectionButton('ORDERS');
    await harness.clickTab('Metadata');

    expect(harness.findTab('Metadata')?.getAttribute('aria-selected')).toBe('true');
    const objectMetadata = document.querySelector(
      `[data-source-import-object-metadata="${orders.objectId}"]`
    );
    expect(objectMetadata).not.toBeNull();
    expect(objectMetadata?.querySelectorAll('[data-source-import-metadata-column]')).toHaveLength(
      3
    );
    expect(
      objectMetadata?.querySelector('[data-source-import-constraint-marker="primary-key"]')
    ).not.toBeNull();
    expect(
      objectMetadata?.querySelector('[data-source-import-constraint-marker="unique"]')
    ).not.toBeNull();
    expect(document.querySelector('[data-source-import-global-options-region]')).not.toBeNull();
  });

  it('opens at the selected source objects when launched from the source explorer', async () => {
    await harness.renderWizard({
      initialSelection: {
        connectionId: 'conn-1',
        sourceObjects: [
          buildSourceObject({
            table: 'CUSTOMERS',
            metricEvidence: buildSourceImportTestMetricEvidence(45000, 8700000),
            columns: [
              { name: 'customer_id', type: 'NUMBER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true },
            ],
          }),
        ],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({ table: 'ORDERS' }),
          buildSourceObject({
            table: 'CUSTOMERS',
            metricEvidence: buildSourceImportTestMetricEvidence(45000, 8700000),
            columns: [
              { name: 'customer_id', type: 'NUMBER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true },
            ],
          }),
        ],
      }),
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Browse source objects');
    expect(document.body.textContent).toContain('CUSTOMERS');
    expect(document.body.textContent).toContain('Selected: 1');
    expect(document.body.textContent).toContain('RAW.ERP.CUSTOMERS');
    expect(document.body.textContent).toContain('45,000 rows');
    expect(document.body.textContent).toContain('customer_id');
    expect(document.body.textContent).toContain('NUMBER');
    expect(document.body.textContent).toContain('NN');
    expect(document.body.textContent).toContain('email');
    expect(document.body.textContent).not.toContain('Nullable');
    expect(document.body.textContent).not.toContain(
      'Output target is selected on a DVT Sink node after sources are attached.'
    );
    expect(document.body.textContent).not.toContain(
      'Choose database, schema, table, and write mode'
    );
  });

  it('binds every imported dbt source table through the selected governed connection', async () => {
    const importSources = vi.fn(buildWarehouseSourceImportPort().importSources);
    await harness.renderWizard({
      initialSelection: {
        kind: 'dbt-source-binding',
        sourceTableDeclarations: [
          {
            uniqueId: 'source.analytics.raw.customers',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'customers',
            database: 'RAW',
            schema: 'ERP',
            identifier: 'CUSTOMERS',
          },
          {
            uniqueId: 'source.analytics.raw.orders',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'orders',
            database: 'RAW',
            schema: 'ERP',
            identifier: 'ORDERS',
          },
        ],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'ORDERS' }),
          buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'CUSTOMERS' }),
          buildSourceObject({ database: 'RAW', schema: 'ERP', table: 'PAYMENTS' }),
        ],
        importSources,
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Browse source objects');
    expect(document.body.textContent).toContain('Selected: 2');
    expect(harness.findButtonContaining('Attach sources to canvas')?.disabled).toBe(false);

    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasId: 'canvas-orders',
        connectionId: 'conn-1',
        objects: [
          { objectId: 'relation/RAW/ERP/ORDERS' },
          { objectId: 'relation/RAW/ERP/CUSTOMERS' },
        ],
        existingDbtSourceTargets: [
          {
            objectId: 'relation/RAW/ERP/CUSTOMERS',
            sourceUniqueId: 'source.analytics.raw.customers',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'customers',
          },
          {
            objectId: 'relation/RAW/ERP/ORDERS',
            sourceUniqueId: 'source.analytics.raw.orders',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'orders',
          },
        ],
      })
    );
  });

  it('refreshes metadata focus for a mandatory dbt source without changing binding selection', async () => {
    const orders = buildSourceObject({
      table: 'ORDERS',
      columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    });
    const customers = buildSourceObject({
      table: 'CUSTOMERS',
      metricEvidence: buildSourceImportTestMetricEvidence(45000, 7000000),
      columns: [{ name: 'customer_email', type: 'VARCHAR', nullable: true }],
    });

    await harness.renderWizard({
      initialSelection: {
        kind: 'dbt-source-binding',
        sourceTableDeclarations: [
          {
            uniqueId: 'source.analytics.raw.orders',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'orders',
            database: 'RAW',
            schema: 'ERP',
            identifier: 'ORDERS',
          },
          {
            uniqueId: 'source.analytics.raw.customers',
            filePath: 'models/sources.yml',
            sourceName: 'raw',
            tableName: 'customers',
            database: 'RAW',
            schema: 'ERP',
            identifier: 'CUSTOMERS',
          },
        ],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [orders, customers],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.flushPendingWork();
    await harness.clickSourceObjectSelectionCheckbox(customers.objectId);

    const activeMetadata = document.querySelector<HTMLElement>(
      '[data-source-import-object-metadata]'
    );

    expect(activeMetadata?.getAttribute('data-source-import-object-metadata')).toBe(
      customers.objectId
    );
    expect(activeMetadata?.textContent).toContain('customer_email');
    expect(activeMetadata?.textContent).toContain('45,000 rows');
    expect(activeMetadata?.textContent).toContain('7 MB');
    expect(activeMetadata?.textContent).not.toContain('order_id');
    expect(
      document
        .querySelector(`[data-source-import-object-select="${orders.objectId}"]`)
        ?.getAttribute('aria-checked')
    ).toBe('true');
    expect(
      document
        .querySelector(`[data-source-import-object-select="${customers.objectId}"]`)
        ?.getAttribute('aria-checked')
    ).toBe('true');
    expect(document.body.textContent).toContain('Selected: 2');
  });

  it('does not carry explorer preselection into a different warehouse connection', async () => {
    const listSourceObjects = vi.fn(async () => [buildSourceObject({ table: 'CUSTOMERS' })]);

    await harness.renderWizard({
      initialSelection: {
        connectionId: 'conn-1',
        sourceObjects: [buildSourceObject({ table: 'CUSTOMERS' })],
      },
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseConnections: async () => [
          {
            id: 'conn-1',
            name: 'Local Postgres proof',
            type: 'postgres',
            database: 'RAW',
          },
          {
            id: 'conn-2',
            name: 'QA Postgres proof',
            type: 'postgres',
            database: 'RAW',
          },
        ],
        listSourceObjects,
      }),
    });
    await harness.flushPendingWork();

    expect(document.body.textContent).toContain('Selected: 1');

    await harness.clickTab('Connections');
    await harness.clickConnectionOption('QA Postgres proof');
    await harness.clickTab('Browse');
    await harness.flushPendingWork();

    expect(listSourceObjects).toHaveBeenLastCalledWith('conn-2');
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

  it('keeps relational sources selectable when the catalog also contains unsupported objects', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({ table: 'ORDERS' }),
          {
            objectId: 'file/s3%3A%2F%2Fwarehouse%2Forders.parquet',
            displayName: 'orders.parquet',
            locator: {
              kind: 'file' as const,
              path: 's3://warehouse/orders.parquet',
              format: 'parquet' as const,
            },
            metricEvidence: buildSourceImportTestMetricEvidence(1500, 4096000),
          },
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');

    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('Files');
    expect(document.body.textContent).toContain(
      'Visible for inspection. This importer currently attaches relational source objects only.'
    );
    expect(document.body.textContent).not.toContain('Failed to load warehouse tables.');
  });

  it('searches source objects by column metadata and keeps active metadata visible while browsing', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(1500, 4096000),
            columns: [
              { name: 'order_id', type: 'INTEGER', nullable: false },
              { name: 'customer_id', type: 'INTEGER', nullable: false },
            ],
          }),
          buildSourceObject({
            table: 'CUSTOMERS',
            metricEvidence: buildSourceImportTestMetricEvidence(45000, 7340032),
            columns: [
              { name: 'customer_id', type: 'INTEGER', nullable: false },
              { name: 'email', type: 'VARCHAR', nullable: true },
            ],
            constraints: [{ name: 'customers_email_key', kind: 'unique', columns: ['email'] }],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');

    const search = document.querySelector<HTMLInputElement>(
      '[data-slot="source-import-object-search"]'
    );

    expect(search).not.toBeNull();
    expect(document.body.textContent).toContain('2 objects available');
    expect(document.body.textContent).toContain('Source metadata');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.querySelector('[data-source-import-catalog-scroll]')?.className).toContain(
      '[&_[data-slot=scroll-area-viewport]>div]:!block'
    );

    await act(async () => {
      if (search) {
        fireEvent.change(search, { target: { value: 'email' } });
      }
    });

    expect(document.body.textContent).toContain('Showing 1 of 2 objects');
    expect(document.body.textContent).toContain('CUSTOMERS');
    expect(document.body.textContent).not.toContain('ORDERS');
    expect(document.body.textContent).toContain('RAW.ERP.CUSTOMERS');
    expect(document.body.textContent).toContain('45,000 rows');
    expect(document.body.textContent).toContain('7 MB');
    const activeObject = document.querySelector('[data-source-import-object-metadata]');
    expect(activeObject?.querySelectorAll('[data-source-import-metadata-column]')).toHaveLength(2);
    expect(
      activeObject?.querySelector('[data-source-import-constraint-marker="unique"]')
    ).not.toBeNull();
  });

  it('keeps a selected-source basket visible while browsing before import', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({
            database: 'RAW',
            schema: 'ERP',
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(1500, 4096000),
            columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
          }),
          buildSourceObject({
            database: 'RAW',
            schema: 'CRM',
            table: 'CUSTOMERS',
            metricEvidence: buildSourceImportTestMetricEvidence(45000, 8700000),
            columns: [{ name: 'email', type: 'VARCHAR', nullable: true }],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);

    expect(document.body.textContent).toContain('Selected sources');
    expect(document.body.textContent).toContain('1 selected');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('1,500 rows');
    expect(document.body.textContent).toContain('1 column');
  });

  it('sends only selected source identity in the import command payload', async () => {
    const importSources = vi.fn(buildWarehouseSourceImportPort().importSources);

    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources,
        listSourceObjects: async () => [
          buildSourceObject({
            database: 'RAW',
            schema: 'ERP',
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(1500, 7340032),
            columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);
    await harness.clickTab('Selected');
    await harness.clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith({
      schemaVersion: 'source-import-request.v2',
      idempotencyKey: expect.stringMatching(/^source-import:/),
      canvasId: 'canvas-orders',
      connectionId: 'conn-1',
      objects: [{ objectId: 'relation/RAW/ERP/ORDERS' }],
      groupingStrategy: 'schema',
      includeColumns: true,
      addTests: false,
      addFreshness: false,
    });
  });

  it('lets users remove selected sources from the basket without losing active metadata', async () => {
    await harness.renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listSourceObjects: async () => [
          buildSourceObject({
            database: 'RAW',
            schema: 'ERP',
            table: 'ORDERS',
            metricEvidence: buildSourceImportTestMetricEvidence(1500, 4096000),
            columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
          }),
        ],
      }),
    });

    await harness.clickConnectionOption('Local Postgres proof');
    await harness.clickTab('Browse');
    await harness.clickSourceObjectSelectionCheckbox(buildSourceObject().objectId);

    expect(document.body.textContent).toContain('Selected: 1');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('order_id');

    await harness.clickButtonByLabel('Remove RAW.ERP.ORDERS');

    expect(document.body.textContent).toContain('Selected: 0');
    expect(document.body.textContent).toContain('No source objects selected yet.');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('order_id');
  });
});
