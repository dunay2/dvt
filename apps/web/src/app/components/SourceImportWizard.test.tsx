// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ImportSourcesResult,
  IWarehouseSourceImportPort,
  WarehouseTable,
} from '../ports/workspace';
import type { SourceImportOptionContribution } from '../plugins/registry';
import { AppServicesProvider } from '../services/AppServicesContext';
import SourceImportWizard from './SourceImportWizard';
import type { SourceImportInitialSelection } from './sourceImportWizard/types';

class TestResizeObserver implements ResizeObserver {
  observe(): void {
    return undefined;
  }

  unobserve(): void {
    return undefined;
  }

  disconnect(): void {
    return undefined;
  }
}

function requireElement<T>(value: T | undefined, errorCode: string): T {
  if (value === undefined) {
    throw new Error(errorCode);
  }

  return value;
}

function buildWarehouseSourceImportPort(
  overrides?: Partial<IWarehouseSourceImportPort>
): IWarehouseSourceImportPort {
  return {
    listWarehouseConnections: async () => [
      {
        id: 'conn-1',
        name: 'Snowflake PROD',
        type: 'snowflake',
        database: 'RAW',
      },
    ],
    listWarehouseTables: async () => [
      {
        database: 'RAW',
        schema: 'ERP',
        table: 'ORDERS',
        rowCount: 100,
      },
    ],
    createWarehouseConnection: async (input) => ({
      id: 'conn-created',
      name: input.name,
      type: input.type,
      database: input.database,
    }),
    testWarehouseConnection: async (connectionId) => ({
      connectionId,
      status: 'passed',
      checkedAt: '2026-06-08T00:00:00.000Z',
      tableCount: 1,
    }),
    importSources: async () => ({
      success: true,
      sourcesCreated: 1,
      tablesImported: 1,
      yamlFiles: ['models/sources/erp.yml'],
      importedNodeIds: ['src_erp_orders'],
      grouping: 'schema',
      options: {
        includeColumns: false,
        addTests: false,
        addFreshness: false,
      },
    }),
    ...overrides,
  };
}

function buildWarehouseTable(overrides: Partial<WarehouseTable>): WarehouseTable {
  return {
    database: 'RAW',
    schema: 'ERP',
    table: 'ORDERS',
    rowCount: 100,
    columns: [{ name: 'order_id', type: 'INTEGER', nullable: false }],
    ...overrides,
  };
}

describe('SourceImportWizard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = TestResizeObserver as unknown as new (
      callback: ResizeObserverCallback
    ) => ResizeObserver;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  async function renderWizard(args?: {
    open?: boolean;
    warehouseSourceImport?: IWarehouseSourceImportPort;
    onClose?: () => void;
    onComplete?: (result: ImportSourcesResult) => void;
    sourceImportOptions?: readonly SourceImportOptionContribution[];
    initialSelection?: SourceImportInitialSelection | null;
  }): Promise<void> {
    await act(async () => {
      root.render(
        <AppServicesProvider
          overrides={{
            ...createAppServicesTestOverrides(),
            warehouseSourceImport: args?.warehouseSourceImport ?? buildWarehouseSourceImportPort(),
          }}
        >
          <SourceImportWizard
            open={args?.open ?? true}
            onClose={args?.onClose ?? vi.fn()}
            onComplete={args?.onComplete}
            sourceImportOptions={args?.sourceImportOptions}
            initialSelection={args?.initialSelection}
          />
        </AppServicesProvider>
      );
    });
  }

  async function flushPendingWork(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  const findNextButton = (): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.trim().startsWith('Next')
    );

  const findTab = (name: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((button) =>
      button.textContent?.includes(name)
    );

  const findButtonContaining = (text: string): HTMLButtonElement | undefined =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes(text)
    );

  const findClickableDivByText = (text: string): HTMLDivElement | undefined =>
    Array.from(document.querySelectorAll<HTMLDivElement>('div.cursor-pointer')).find((node) =>
      node.textContent?.includes(text)
    );

  const clickTab = async (name: string): Promise<void> => {
    const tab = requireElement(findTab(name), `EXPECTED_TAB:${name}`);
    await act(async () => {
      tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const clickClickableDivByText = async (text: string): Promise<void> => {
    const node = requireElement(findClickableDivByText(text), `EXPECTED_CLICKABLE_DIV:${text}`);
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  const clickButtonContaining = async (text: string): Promise<void> => {
    const button = requireElement(findButtonContaining(text), `EXPECTED_BUTTON:${text}`);
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  it('opens on governed database connections without unavailable source-type placeholders', async () => {
    const onClose = vi.fn();

    await renderWizard({ onClose });

    expect(document.body.textContent).toContain('Add source');
    expect(document.body.textContent).toContain('Connections');
    expect(document.body.textContent).toContain('Browse');
    expect(document.body.textContent).toContain('Metadata');
    expect(document.body.textContent).toContain('Selected');
    expect(document.body.textContent).not.toContain('DataObject Registry');
    expect(document.body.textContent).toContain('Choose database connection');
    expect(document.body.textContent).toContain('Snowflake PROD');
    expect(document.body.textContent).not.toContain('File');
    expect(document.body.textContent).not.toContain('API');
    expect(document.body.textContent).not.toContain('Stream');
    expect(document.body.textContent).not.toContain('not available yet');
    expect(document.body.textContent).not.toContain('Only Database is available');
    expect(findButtonContaining('Back')).toBeUndefined();
    expect(findNextButton()).toBeUndefined();
    expect(findTab('Browse')?.disabled).toBe(true);
    expect(findTab('Metadata')?.disabled).toBe(true);
    expect(findTab('Selected')?.disabled).toBe(true);

    await clickClickableDivByText('Snowflake PROD');
    await clickTab('Browse');

    expect(document.body.textContent).toContain('Browse source tables');
    expect(document.body.textContent).toContain('ORDERS');
  });

  it('uses contextual tabs to inspect source metadata without leaving the add-source surface', async () => {
    await renderWizard({
      warehouseSourceImport: buildWarehouseSourceImportPort({
        listWarehouseTables: async () => [
          buildWarehouseTable({
            table: 'ORDERS',
            rowCount: 1500,
            columns: [
              { name: 'order_id', type: 'INTEGER', nullable: false },
              { name: 'customer_id', type: 'INTEGER', nullable: false },
              { name: 'discount_code', type: 'TEXT', nullable: true },
            ],
          }),
        ],
      }),
    });

    await clickClickableDivByText('Snowflake PROD');
    await clickTab('Browse');
    await clickClickableDivByText('ORDERS');
    await clickTab('Metadata');

    expect(findTab('Metadata')?.getAttribute('aria-selected')).toBe('true');
    expect(document.body.textContent).toContain('RAW.ERP.ORDERS');
    expect(document.body.textContent).toContain('1,500 rows');
    expect(document.body.textContent).toContain('3 columns');
    expect(document.body.textContent).toContain('order_id');
    expect(document.body.textContent).toContain('INTEGER');
    expect(document.body.textContent).toContain('Required');
    expect(document.body.textContent).toContain('discount_code');
    expect(document.body.textContent).toContain('Nullable');
    expect(document.body.textContent).toContain('Metadata Options');
  });

  it('opens at the selected warehouse tables when launched from the source explorer', async () => {
    await renderWizard({
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
    await flushPendingWork();

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

    await renderWizard({
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
    await flushPendingWork();

    expect(document.body.textContent).toContain('Selected: 1');

    await clickTab('Connections');
    await clickClickableDivByText('Snowflake QA');
    await clickTab('Browse');
    await flushPendingWork();

    expect(listWarehouseTables).toHaveBeenLastCalledWith('conn-2');
    expect(document.body.textContent).toContain('Selected: 0');
  });

  it('explores governed database connections with search before table discovery', async () => {
    await renderWizard({
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
      search?.focus();
      if (search) {
        search.value = 'prod';
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'prod' }));
    });

    expect(document.body.textContent).toContain('Production warehouse');
    expect(document.body.textContent).not.toContain('Sandbox warehouse');
  });

  it('completes import flow, applies imported sources immediately, and renders a passive result step', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();

    await renderWizard({ onClose, onComplete });

    await clickClickableDivByText('Snowflake PROD');

    await clickTab('Browse');

    await clickClickableDivByText('ORDERS');

    await clickTab('Selected');

    await clickButtonContaining('Attach sources to canvas');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        importedNodeIds: ['src_erp_orders'],
      })
    );
    expect(document.body.textContent).toContain('Sources attached');
    expect(document.body.textContent).toContain('Groups created:');
    expect(document.body.textContent).toContain('models/sources/erp.yml');
    expect(document.body.textContent).toContain(
      'Canvas queued the imported source ids and will focus them when the governed draft authority refreshes'
    );
    expect(document.body.textContent).not.toContain('Add imported sources to canvas');

    await clickButtonContaining('Done');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders only the source import options declared by the active plugin', async () => {
    await renderWizard({
      sourceImportOptions: [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description: 'Add columns to the plugin-owned source artifact.',
          defaultEnabled: false,
          order: 10,
        },
      ],
    });

    await clickClickableDivByText('Snowflake PROD');
    await clickTab('Browse');
    await clickClickableDivByText('ORDERS');
    await clickTab('Metadata');

    expect(document.body.textContent).toContain('Include Column Metadata');
    expect(document.body.textContent).not.toContain('Add Generic Tests');
    expect(document.body.textContent).not.toContain('Add Freshness Checks');
  });

  it('applies plugin option defaults when runtime declarations arrive after mount', async () => {
    const importSources = vi.fn(buildWarehouseSourceImportPort().importSources);
    const warehouseSourceImport = buildWarehouseSourceImportPort({ importSources });

    await renderWizard({
      warehouseSourceImport,
      sourceImportOptions: [],
    });
    await renderWizard({
      warehouseSourceImport,
      sourceImportOptions: [
        {
          id: 'includeColumns',
          label: 'Include Column Metadata',
          description: 'Add columns to the plugin-owned source artifact.',
          defaultEnabled: true,
          order: 10,
        },
      ],
    });

    await clickClickableDivByText('Snowflake PROD');
    await clickTab('Browse');
    await clickClickableDivByText('ORDERS');
    await clickTab('Metadata');

    await clickButtonContaining('Attach sources to canvas');

    expect(importSources).toHaveBeenCalledWith(
      expect.objectContaining({
        includeColumns: true,
        addTests: false,
        addFreshness: false,
      })
    );
  });

  it('surfaces a no-op result when the selected sources already exist and does not fire the canvas handoff', async () => {
    const onComplete = vi.fn();

    await renderWizard({
      onComplete,
      warehouseSourceImport: buildWarehouseSourceImportPort({
        importSources: async () => ({
          success: true,
          sourcesCreated: 0,
          tablesImported: 1,
          yamlFiles: ['models/sources/erp.yml'],
          importedNodeIds: [],
          grouping: 'schema',
          options: {
            includeColumns: false,
            addTests: false,
            addFreshness: false,
          },
        }),
      }),
    });

    await clickClickableDivByText('Snowflake PROD');

    await clickTab('Browse');

    await clickClickableDivByText('ORDERS');

    await clickTab('Selected');

    await clickButtonContaining('Attach sources to canvas');

    expect(onComplete).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('No new data objects were added');
    expect(document.body.textContent).toContain('Canvas stayed unchanged');
  });
});
