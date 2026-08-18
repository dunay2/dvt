// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  IWarehouseSourceImportPort,
  TestWarehouseConnectionResult,
} from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanonicalNode } from '../../types/canonical';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtAuthoringFields } from './DvtAuthoringFields';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: ({
    ariaLabel,
    language,
    onChange,
    path,
    value,
  }: {
    ariaLabel: string;
    language: string;
    onChange: (value: string) => void;
    path?: string;
    value: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-language={language}
      data-path={path}
      data-testid="dvt-transform-sql-editor"
      onChange={(event) => onChange(event.currentTarget.value)}
      value={value}
    />
  ),
}));

function buildDvtNode(
  kind: 'dvt:source' | 'dvt:sql_transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `dvt-${kind.replace('dvt:', '').replace('_', '-')}`,
    name: kind === 'dvt:sql_transform' ? 'Clean Orders' : 'Orders',
    pluginId: 'dvt',
    kind,
    role: kind === 'dvt:source' ? 'input' : kind === 'dvt:sink' ? 'output' : 'transform',
    status: 'idle',
    tags: ['authoring'],
    metadata,
  };
}

function buildImportedWarehouseSourceNode(): CanonicalNode {
  return {
    id: 'src_warehouse_prod_analytics_erp_orders',
    name: 'src_warehouse_prod_analytics_erp_orders',
    description: 'Imported source for analytics.erp.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'erp'],
    path: 'models/sources/src_erp.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_erp',
      tableName: 'orders',
      database: 'analytics',
      schema: 'erp',
      columns: [{ name: 'id', type: 'number', nullable: false }],
    },
  };
}

function DvtAuthoringFieldsHarness({
  node,
  warehouseSourceImport,
  externalConnectionId,
}: Readonly<{
  node: CanonicalNode;
  warehouseSourceImport?: IWarehouseSourceImportPort;
  externalConnectionId?: string;
}>): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const errors = validateCanvasInspectorNodeDraft(draft);

  const fields = (
    <>
      {externalConnectionId ? (
        <button
          type="button"
          data-slot="load-external-connection"
          onClick={() => {
            setDraft((currentDraft) =>
              currentDraft.dvt?.kind === 'source'
                ? {
                    ...currentDraft,
                    dvt: {
                      ...currentDraft.dvt,
                      connectionRef: {
                        schemaVersion: 'connection-ref.v1',
                        connectionId: externalConnectionId,
                        provider: 'postgres',
                      },
                    },
                  }
                : currentDraft
            );
          }}
        >
          Load external connection
        </button>
      ) : null}
      <DvtAuthoringFields
        node={node}
        disabled={false}
        draft={draft}
        errors={errors}
        onChange={setDraft}
      />
      <output data-slot="dvt-draft-json">{JSON.stringify(draft.dvt)}</output>
    </>
  );
  if (!warehouseSourceImport) return fields;

  return (
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        warehouseSourceImport,
      }}
    >
      {fields}
    </AppServicesProvider>
  );
}

describe('DvtAuthoringFields', () => {
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
    vi.clearAllMocks();
  });

  function renderFields(
    node: CanonicalNode,
    warehouseSourceImport?: IWarehouseSourceImportPort,
    externalConnectionId?: string
  ): void {
    act(() => {
      root.render(
        <DvtAuthoringFieldsHarness
          node={node}
          warehouseSourceImport={warehouseSourceImport}
          externalConnectionId={externalConnectionId}
        />
      );
    });
  }

  function draftJson(): string {
    return container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
  }

  it('renders imported source target metadata and updates the source alias draft', () => {
    renderFields(buildImportedWarehouseSourceNode());

    const schemaFact = container.querySelector('[data-slot="dvt-source-schema-readonly"]');
    const tableFact = container.querySelector('[data-slot="dvt-source-table-readonly"]');
    const aliasInput = container.querySelector(
      'input[name="dvt-source-alias"]'
    ) as HTMLInputElement | null;

    expect(container.textContent).toContain('DVT source');
    expect(container.textContent).toContain('erp.orders');
    expect(container.textContent).not.toContain('analytics.erp.orders');
    expect(container.querySelector('input[name="dvt-source-database"]')).toBeNull();
    expect(container.querySelector('input[name="dvt-source-schema"]')).toBeNull();
    expect(container.querySelector('input[name="dvt-source-table"]')).toBeNull();
    expect(schemaFact?.textContent).toBe('erp');
    expect(schemaFact?.getAttribute('aria-label')).toBe('Schema: erp');
    expect(tableFact?.textContent).toBe('orders');
    expect(tableFact?.getAttribute('aria-label')).toBe('Table: orders');
    expect(aliasInput?.value).toBe('warehouse_prod_analytics_erp');

    act(() => {
      fireEvent.input(aliasInput!, { target: { value: 'orders_src' } });
    });

    expect(draftJson()).toContain('"alias":"orders_src"');
  });

  it('keeps manually authored source schema and table editable', () => {
    renderFields(
      buildDvtNode('dvt:source', {
        config: { schema: 'raw', table: 'orders', alias: 'raw_orders' },
      })
    );

    const schemaInput = container.querySelector(
      'input[name="dvt-source-schema"]'
    ) as HTMLInputElement | null;
    const tableInput = container.querySelector(
      'input[name="dvt-source-table"]'
    ) as HTMLInputElement | null;

    expect(schemaInput?.value).toBe('raw');
    expect(tableInput?.value).toBe('orders');

    act(() => {
      fireEvent.input(schemaInput!, { target: { value: 'curated' } });
      fireEvent.input(tableInput!, { target: { value: 'orders_daily' } });
    });

    expect(draftJson()).toContain('"schema":"curated"');
    expect(draftJson()).toContain('"table":"orders_daily"');
  });

  it('renders SQL transform feedback and updates the SQL draft', () => {
    renderFields(
      buildDvtNode('dvt:sql_transform', {
        config: {
          sql: 'select * from public.orders',
        },
      })
    );

    const sqlEditor = container.querySelector(
      '[data-testid="dvt-transform-sql-editor"]'
    ) as HTMLTextAreaElement | null;

    expect(container.textContent).toContain('DVT SQL transform');
    expect(container.textContent).toContain('1 line');
    expect(sqlEditor).not.toBeNull();
    expect(sqlEditor?.value).toBe('select * from public.orders');
    expect(sqlEditor?.dataset.language).toBe('sql');
    expect(sqlEditor?.dataset.path).toBe('canvas/dvt-sql-transform.sql');

    act(() => {
      fireEvent.input(sqlEditor!, { target: { value: 'select id from public.orders' } });
    });

    expect(draftJson()).toContain('"sql":"select id from public.orders"');
  });

  it('does not present connected source columns as editable DVT transform inputs', () => {
    const source = buildImportedWarehouseSourceNode();
    const transform = buildDvtNode('dvt:sql_transform', {
      config: {
        sql: 'select id from analytics.erp.orders',
        selectedColumns: [`${source.id}.id`],
      },
    });

    renderFields(transform);

    expect(container.querySelector('input[name="dvt-transform-column"]')).toBeNull();
    expect(draftJson()).not.toContain('selectedColumns');
  });

  it('renders sink destination posture and updates materialization controls', () => {
    renderFields(
      buildDvtNode('dvt:sink', {
        config: {
          database: 'analytics_prod',
          schema: 'marts',
          table: 'orders_daily',
          materialization: 'view',
          writeMode: 'append',
          partitionStrategy: 'daily_by_order_date',
        },
      })
    );

    const materializationSelect = container.querySelector(
      'select[name="dvt-sink-materialization"]'
    ) as HTMLSelectElement | null;
    const writeModeSelect = container.querySelector(
      'select[name="dvt-sink-write-mode"]'
    ) as HTMLSelectElement | null;
    expect(container.textContent).toContain('DVT sink');
    expect(container.textContent).toContain('marts.orders_daily');
    expect(container.textContent).not.toContain('analytics_prod.marts.orders_daily');
    expect(container.textContent).not.toContain('daily_by_order_date');
    expect(container.querySelector('input[name="dvt-sink-database"]')).toBeNull();
    expect(container.querySelector('input[name="dvt-sink-partition-strategy"]')).toBeNull();
    expect(materializationSelect?.value).toBe('view');
    expect(writeModeSelect?.value).toBe('append');

    act(() => {
      fireEvent.change(materializationSelect!, { target: { value: 'table' } });
      fireEvent.change(writeModeSelect!, { target: { value: 'replace' } });
    });

    expect(draftJson()).not.toContain('database');
    expect(draftJson()).toContain('"materialization":"table"');
    expect(draftJson()).toContain('"writeMode":"replace"');
    expect(draftJson()).not.toContain('partitionStrategy');
  });

  it('discards a connection-test response after the selected connection changes', async () => {
    const baseWarehouseSourceImport = createAppServicesTestOverrides().warehouseSourceImport;
    if (!baseWarehouseSourceImport)
      throw new Error('Warehouse source import test port is required.');
    let resolveConnectionTest!: (result: TestWarehouseConnectionResult) => void;
    const connectionTest = new Promise<TestWarehouseConnectionResult>((resolve) => {
      resolveConnectionTest = resolve;
    });
    const testWarehouseConnection = vi.fn(() => connectionTest);
    const warehouseSourceImport: IWarehouseSourceImportPort = {
      ...baseWarehouseSourceImport,
      listWarehouseConnections: async () => [
        { id: 'warehouse-a', name: 'Warehouse A', type: 'postgres', database: 'orders_a' },
        { id: 'warehouse-b', name: 'Warehouse B', type: 'postgres', database: 'orders_b' },
      ],
      testWarehouseConnection,
    };
    renderFields(
      buildDvtNode('dvt:source', {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        config: { schema: 'raw', table: 'orders', alias: 'orders' },
      }),
      warehouseSourceImport
    );
    await act(async () => Promise.resolve());

    const connectionSelect = container.querySelector(
      'select[name="dvt-source-connection"]'
    ) as HTMLSelectElement;
    const testButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Test')
    );
    expect(testButton).toBeDefined();

    act(() => {
      fireEvent.click(testButton!);
      fireEvent.change(connectionSelect, { target: { value: 'warehouse-b' } });
    });
    await act(async () => {
      resolveConnectionTest({
        connectionId: 'warehouse-a',
        status: 'passed',
        checkedAt: '2026-08-15T00:00:00.000Z',
        objectCount: 12,
      });
      await connectionTest;
    });

    expect(testWarehouseConnection).toHaveBeenCalledWith('warehouse-a');
    expect(connectionSelect.value).toBe('warehouse-b');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('clears visible connection-test feedback after an authoritative selection change', async () => {
    const baseWarehouseSourceImport = createAppServicesTestOverrides().warehouseSourceImport;
    if (!baseWarehouseSourceImport)
      throw new Error('Warehouse source import test port is required.');
    const warehouseSourceImport: IWarehouseSourceImportPort = {
      ...baseWarehouseSourceImport,
      listWarehouseConnections: async () => [
        { id: 'warehouse-a', name: 'Warehouse A', type: 'postgres', database: 'orders_a' },
        { id: 'warehouse-b', name: 'Warehouse B', type: 'postgres', database: 'orders_b' },
      ],
      testWarehouseConnection: async (connectionId) => ({
        connectionId,
        status: 'passed',
        checkedAt: '2026-08-15T00:00:00.000Z',
        objectCount: 12,
      }),
    };
    renderFields(
      buildDvtNode('dvt:source', {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        config: { schema: 'raw', table: 'orders', alias: 'orders' },
      }),
      warehouseSourceImport,
      'warehouse-b'
    );
    await act(async () => Promise.resolve());

    const testButton = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Test')
    );
    expect(testButton).toBeDefined();
    await act(async () => {
      fireEvent.click(testButton!);
      await Promise.resolve();
    });
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    act(() => {
      fireEvent.click(container.querySelector('[data-slot="load-external-connection"]')!);
    });

    expect(
      (container.querySelector('select[name="dvt-source-connection"]') as HTMLSelectElement).value
    ).toBe('warehouse-b');
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
