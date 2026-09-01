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
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createMockWarehouseSourceImportPort } from '../../../testing/workspacePortDoubles';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
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
    diagnostics = [],
  }: {
    ariaLabel: string;
    language: string;
    onChange: (value: string) => void;
    path?: string;
    value: string;
    diagnostics?: readonly { message: string }[];
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-language={language}
      data-path={path}
      data-testid="dvt-transform-sql-editor"
      data-diagnostics={JSON.stringify(diagnostics)}
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

function buildJoinWarehouseSourceNode(args: {
  id: string;
  table: string;
  columns: readonly string[];
  connectionId?: string;
}): CanonicalNode {
  return {
    id: args.id,
    name: args.table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      sourceName: args.table,
      tableName: args.table,
      schema: 'public',
      columns: args.columns.map((name) => ({ name, type: 'string', nullable: false })),
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: args.connectionId ?? 'warehouse-main',
        },
        sourceObjectId: `public.${args.table}`,
      },
    },
  };
}

function DvtAuthoringFieldsHarness({
  node,
  nodes,
  edges,
  section,
  warehouseSourceImport,
  externalConnectionId,
}: Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  section?: 'all' | 'general' | 'columns' | 'code';
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
        nodes={nodes}
        edges={edges}
        disabled={false}
        draft={draft}
        errors={errors}
        section={section}
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
    useApplicationLanguageStore.setState({ language: 'en' });
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
    useApplicationLanguageStore.setState({ language: 'en' });
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function renderFields(
    node: CanonicalNode,
    warehouseSourceImport?: IWarehouseSourceImportPort,
    externalConnectionId?: string,
    nodes?: readonly CanonicalNode[],
    edges?: readonly CanonicalEdge[],
    section?: 'all' | 'general' | 'columns' | 'code'
  ): void {
    act(() => {
      root.render(
        <DvtAuthoringFieldsHarness
          node={node}
          nodes={nodes}
          edges={edges}
          section={section}
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

  it('renders one SQL transform editor without a duplicate summary and updates the draft', () => {
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
    expect(container.textContent).not.toContain('1 line');
    expect(container.textContent).not.toContain('SQL body');
    expect(sqlEditor).not.toBeNull();
    expect(sqlEditor?.value).toBe('select * from public.orders');
    expect(sqlEditor?.dataset.language).toBe('sql');
    expect(sqlEditor?.dataset.path).toBe('canvas/dvt-sql-transform.sql');

    act(() => {
      fireEvent.input(sqlEditor!, { target: { value: 'select id from public.orders' } });
    });

    expect(draftJson()).toContain('"sql":"select id from public.orders"');
  });

  it('starts one typed Substrait INNER JOIN from two compatible connected datasets', () => {
    const customers = buildJoinWarehouseSourceNode({
      id: 'source-customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
    });
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
    });
    const transform = buildDvtNode('dvt:sql_transform');
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'customers-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(transform, undefined, undefined, [customers, orders, transform], edges, 'code');

    const entry = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-substrait-inner-join"]'
    );
    expect(entry).not.toBeNull();

    act(() => {
      fireEvent.click(entry!);
    });

    expect(
      container.querySelector('[data-slot="dvt-substrait-inner-join-authoring"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('customers');
    expect(container.textContent).toContain('orders');
    expect(container.textContent).toContain('customer_id');
    expect(container.querySelector('[data-testid="dvt-transform-sql-editor"]')).toBeNull();
    expect(draftJson()).toContain('"shape":"inner_join"');

    const customerIdSelection = container.querySelector<HTMLInputElement>(
      'input[name="dvt-substrait-inner-join-field"][value="left.customer_id"]'
    );
    const nameOutput = container.querySelector<HTMLInputElement>(
      'input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]'
    );
    const moveOrderUp = container.querySelector<HTMLButtonElement>(
      'button[data-action="move-substrait-inner-join-field-up"][data-field-key="right.order_id"]'
    );
    expect(customerIdSelection?.checked).toBe(true);
    expect(nameOutput?.value).toBe('name');
    expect(moveOrderUp).not.toBeNull();

    act(() => {
      fireEvent.click(customerIdSelection!);
    });
    const currentNameOutput = container.querySelector<HTMLInputElement>(
      'input[data-slot="dvt-substrait-inner-join-output-name"][data-field-key="left.name"]'
    );
    act(() => {
      fireEvent.focus(currentNameOutput!);
      fireEvent.input(currentNameOutput!, { target: { value: 'customer_name' } });
      fireEvent.focusOut(currentNameOutput!);
    });
    const currentMoveOrderUp = container.querySelector<HTMLButtonElement>(
      'button[data-action="move-substrait-inner-join-field-up"][data-field-key="right.order_id"]'
    );
    act(() => {
      fireEvent.click(currentMoveOrderUp!);
    });

    expect(customerIdSelection?.checked).toBe(false);
    expect(draftJson()).toContain('"names":["order_id","customer_name"]');
    expect(draftJson()).toContain('"fieldId":"field:dvt-sql-transform:name"');
    expect(draftJson()).toContain('"displayName":"customer_name"');
    expect(draftJson()).not.toContain('selectedColumns');

    const grainField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-inner-join-grain-field"]'
    );
    const countOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-inner-join-count-output-name"]'
    );
    const applyGrouping = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-inner-join-apply-grouping"]'
    );
    expect(grainField).not.toBeNull();
    expect(countOutput).not.toBeNull();
    act(() => {
      fireEvent.change(grainField!, { target: { value: 'field:dvt-sql-transform:name' } });
      fireEvent.input(countOutput!, { target: { value: 'order_count' } });
      fireEvent.click(applyGrouping!);
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-inner-join-grouping-authoring"]')
    ).not.toBeNull();
    expect(draftJson()).toContain('"case":"aggregate"');

    const rankOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-inner-join-window-output-name"]'
    );
    const applyWindow = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-inner-join-apply-window"]'
    );
    act(() => {
      fireEvent.input(rankOutput!, { target: { value: 'count_rank' } });
      fireEvent.keyDown(applyWindow!, { key: 'Enter' });
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]')
    ).not.toBeNull();
    expect(draftJson()).toContain('"names":["customer_name","order_count","count_rank"]');
    expect(draftJson()).toContain('"case":"windowFunction"');
  });

  it('appends connected inputs repeatedly through one explicit field-predicate control', () => {
    const customers = buildJoinWarehouseSourceNode({
      id: 'source-customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
    });
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
    });
    const shipments = buildJoinWarehouseSourceNode({
      id: 'source-shipments',
      table: 'shipments',
      columns: ['shipment_id', 'customer_id', 'name'],
    });
    const tickets = buildJoinWarehouseSourceNode({
      id: 'source-tickets',
      table: 'tickets',
      columns: ['ticket_id', 'customer_id'],
    });
    const profiles = buildJoinWarehouseSourceNode({
      id: 'source-profiles',
      table: 'profiles',
      columns: ['customer_id', 'name'],
    });
    const transform = buildDvtNode('dvt:sql_transform');
    const initialEdges: readonly CanonicalEdge[] = [
      {
        id: 'customers-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(
      transform,
      undefined,
      undefined,
      [customers, orders, shipments, tickets, profiles, transform],
      initialEdges,
      'code'
    );
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-substrait-inner-join"]')!
      );
    });

    const allEdges: readonly CanonicalEdge[] = [
      ...initialEdges,
      {
        id: 'shipments-transform',
        sourceId: shipments.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'tickets-transform',
        sourceId: tickets.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'profiles-transform',
        sourceId: profiles.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];
    renderFields(
      transform,
      undefined,
      undefined,
      [customers, orders, shipments, tickets, profiles, transform],
      allEdges,
      'code'
    );

    const chooseConnectedField = (nodeId: string): void => {
      const rightField = container.querySelector<HTMLSelectElement>(
        '[data-slot="dvt-substrait-append-right-field"]'
      );
      act(() => {
        fireEvent.change(rightField!, { target: { value: `${nodeId}\u001fcustomer_id` } });
        fireEvent.click(
          container.querySelector<HTMLButtonElement>('[data-slot="dvt-substrait-append-submit"]')!
        );
      });
    };

    chooseConnectedField(shipments.id);
    expect(draftJson()).toContain('field:dvt-sql-transform:shipment_id');
    expect(
      container.querySelector('[data-slot="dvt-substrait-n-input-join-authoring"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('customers + orders + shipments');

    chooseConnectedField(tickets.id);
    expect(draftJson()).toContain('field:dvt-sql-transform:ticket_id');
    expect(container.textContent).toContain('customers + orders + shipments + tickets');
    expect(draftJson()).toContain('dvt-vtx2-n-input-inner-join-card');

    chooseConnectedField(profiles.id);
    expect(draftJson()).toContain('field:dvt-sql-transform:profiles_name');
    expect(container.textContent).toContain('customers + orders + shipments + tickets + profiles');

    const shipmentCustomerSelection = container.querySelector<HTMLInputElement>(
      'input[name="dvt-substrait-n-input-field"][value="field:source-shipments:customer_id"]'
    );
    expect(shipmentCustomerSelection?.checked).toBe(false);
    act(() => {
      fireEvent.click(shipmentCustomerSelection!);
    });
    const shipmentCustomerOutput = container.querySelector<HTMLInputElement>(
      'input[data-slot="dvt-substrait-n-input-output-name"][data-source-field-id="field:source-shipments:customer_id"]'
    );
    expect(shipmentCustomerOutput?.value).toBe('shipments_customer_id');
    act(() => {
      fireEvent.input(shipmentCustomerOutput!, { target: { value: 'shipping_customer' } });
      fireEvent.focusOut(shipmentCustomerOutput!);
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          'button[data-action="move-substrait-n-input-field-up"][data-source-field-id="field:source-shipments:customer_id"]'
        )!
      );
    });
    expect(draftJson()).toContain('"fieldId":"field:dvt-sql-transform:shipments_customer_id"');
    expect(draftJson()).toContain('"displayName":"shipping_customer"');

    const grainField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-inner-join-grain-field"]'
    );
    const countOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-inner-join-count-output-name"]'
    );
    act(() => {
      fireEvent.change(grainField!, {
        target: { value: 'field:dvt-sql-transform:shipment_id' },
      });
      fireEvent.input(countOutput!, { target: { value: 'shipment_count' } });
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-substrait-inner-join-apply-grouping"]'
        )!
      );
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-inner-join-grouping-authoring"]')
    ).not.toBeNull();

    const rankOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-inner-join-window-output-name"]'
    );
    act(() => {
      fireEvent.input(rankOutput!, { target: { value: 'shipment_rank' } });
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          '[data-slot="dvt-substrait-inner-join-apply-window"]'
        )!
      );
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-inner-join-grouped-window-authoring"]')
    ).not.toBeNull();
    expect(draftJson()).toContain('"displayName":"shipment_count"');
    expect(draftJson()).toContain('"displayName":"shipment_rank"');
  });

  it('does not offer INNER JOIN when the connected datasets use different connections', () => {
    const customers = buildJoinWarehouseSourceNode({
      id: 'source-customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
      connectionId: 'warehouse-a',
    });
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
      connectionId: 'warehouse-b',
    });
    const transform = buildDvtNode('dvt:sql_transform');
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'customers-transform',
        sourceId: customers.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(transform, undefined, undefined, [customers, orders, transform], edges, 'code');

    expect(container.querySelector('[data-slot="dvt-start-substrait-inner-join"]')).toBeNull();
  });

  it('starts one typed Substrait UNION ALL from two compatible connected datasets', () => {
    const north = buildJoinWarehouseSourceNode({
      id: 'source-customers-north',
      table: 'customers_north',
      columns: ['customer_id', 'name', 'country'],
    });
    const south = buildJoinWarehouseSourceNode({
      id: 'source-customers-south',
      table: 'customers_south',
      columns: ['customer_id', 'name', 'country'],
    });
    const transform = buildDvtNode('dvt:sql_transform');
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'north-transform',
        sourceId: north.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'south-transform',
        sourceId: south.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(transform, undefined, undefined, [north, south, transform], edges, 'code');

    const entry = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-substrait-union-all"]'
    );
    expect(entry).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-start-substrait-inner-join"]')).toBeNull();

    act(() => {
      fireEvent.keyDown(entry!, { key: 'Enter' });
    });

    expect(
      container.querySelector('[data-slot="dvt-substrait-union-all-authoring"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('customers_north');
    expect(container.textContent).toContain('customers_south');
    expect(container.textContent).toContain('customer_id, name, country');
    expect(container.querySelector('[data-testid="dvt-transform-sql-editor"]')).toBeNull();
    expect(draftJson()).toContain('"shape":"union_all"');
    expect(draftJson()).toContain('"case":"set"');

    const nameSelection = container.querySelector<HTMLInputElement>(
      'input[data-slot="dvt-substrait-union-all-field"][data-field-key="name"]'
    );
    const countryOutput = container.querySelector<HTMLInputElement>(
      'input[data-slot="dvt-substrait-union-all-output-name"][data-field-key="country"]'
    );
    expect(nameSelection?.checked).toBe(true);
    expect(countryOutput?.value).toBe('country');

    act(() => {
      fireEvent.click(nameSelection!);
      fireEvent.input(countryOutput!, { target: { value: 'region' } });
      fireEvent.focusOut(countryOutput!);
    });
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>(
          'button[data-action="move-substrait-union-all-field-up"][data-field-key="country"]'
        )!
      );
    });
    expect(draftJson()).toContain('"names":["region","customer_id"]');
    expect(draftJson()).toContain('"fieldId":"field:dvt-sql-transform:country"');
    expect(draftJson()).toContain('"displayName":"region"');

    const grainField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-union-all-grain-field"]'
    );
    const countOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-union-all-count-output-name"]'
    );
    const applyGrouping = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-union-all-apply-grouping"]'
    );
    expect(grainField).not.toBeNull();
    expect(countOutput).not.toBeNull();
    act(() => {
      fireEvent.change(grainField!, {
        target: { value: 'field:dvt-sql-transform:country' },
      });
      fireEvent.input(countOutput!, { target: { value: 'customer_count' } });
      fireEvent.keyDown(applyGrouping!, { key: 'Enter' });
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-union-all-grouping-authoring"]')
    ).not.toBeNull();
    expect(draftJson()).toContain('"case":"aggregate"');

    const rankOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-union-all-window-output-name"]'
    );
    const applyWindow = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-union-all-apply-window"]'
    );
    act(() => {
      fireEvent.input(rankOutput!, { target: { value: 'count_rank' } });
      fireEvent.click(applyWindow!);
    });
    expect(
      container.querySelector('[data-slot="dvt-substrait-union-all-grouped-window-authoring"]')
    ).not.toBeNull();
    expect(draftJson()).toContain('"names":["region","customer_count","count_rank"]');
    expect(draftJson()).toContain('"case":"windowFunction"');
  });

  it('keeps only the latest governed SQL validation and localizes its diagnostic', async () => {
    vi.useFakeTimers();
    useApplicationLanguageStore.setState({ language: 'es' });
    let resolveFirst: ((value: { status: 'valid' }) => void) | undefined;
    const validatePostgresTransformSql = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ status: 'valid' }>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({
        status: 'invalid',
        diagnostics: [
          {
            code: 'undefined_column',
            source: 'postgres',
            message: 'column missing_column does not exist',
            startOffset: 7,
            endOffset: 21,
          },
        ],
      });
    const warehouseSourceImport = {
      ...createMockWarehouseSourceImportPort(),
      validatePostgresTransformSql,
    };
    const baseSource = buildImportedWarehouseSourceNode();
    const source: CanonicalNode = {
      ...baseSource,
      metadata: {
        ...baseSource.metadata,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse-prod',
          },
          sourceObjectId: 'relation/analytics/erp/orders',
        },
      },
    };
    const transform = buildDvtNode('dvt:sql_transform', {
      config: { sql: 'select order_id from analytics.erp.orders' },
    });
    const edges: readonly CanonicalEdge[] = [
      { id: 'source-transform', sourceId: source.id, targetId: transform.id, relation: 'lineage' },
    ];

    renderFields(transform, warehouseSourceImport, undefined, [source, transform], edges, 'code');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const editor = container.querySelector(
      '[data-testid="dvt-transform-sql-editor"]'
    ) as HTMLTextAreaElement;
    act(() => {
      fireEvent.input(editor, {
        target: { value: 'select missing_column from analytics.erp.orders' },
      });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(container.textContent).toContain('PostgreSQL no encuentra esta columna.');
    expect(editor.dataset.diagnostics).toContain('PostgreSQL no encuentra esta columna.');

    await act(async () => {
      resolveFirst?.({ status: 'valid' });
      await Promise.resolve();
    });
    expect(container.textContent).toContain('PostgreSQL no encuentra esta columna.');
    expect(validatePostgresTransformSql).toHaveBeenLastCalledWith({
      connectionRef: expect.objectContaining({ connectionId: 'warehouse-prod' }),
      sql: 'select missing_column from analytics.erp.orders',
    });
    vi.useRealTimers();
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

  it('edits the visual recipe from source inputs without creating another SQL editor', () => {
    const source = buildImportedWarehouseSourceNode();
    const transform = buildDvtNode('dvt:sql_transform', {
      transformAuthoring: {
        version: 'v1',
        mode: 'visual',
        recipe: {
          version: 'v1',
          outputs: [
            {
              id: 'output:id',
              name: 'id',
              dataType: 'number',
              expression: {
                inputs: [{ nodeId: source.id, columnName: 'id' }],
                operations: [{ kind: 'passthrough' }],
              },
            },
          ],
          filters: [],
        },
      },
    });
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'source-transform',
        sourceId: source.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];
    renderFields(transform, undefined, undefined, [source, transform], edges, 'columns');

    const outputName = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-visual-output-name"]'
    );
    expect(container.querySelector('[data-slot="dvt-visual-recipe-authoring"]')).not.toBeNull();
    expect(container.textContent).toContain('Visual recipe');
    expect(outputName?.value).toBe('id');
    expect(container.querySelector('[data-testid="dvt-transform-sql-editor"]')).toBeNull();

    act(() => {
      fireEvent.input(outputName!, { target: { value: 'order_id' } });
      fireEvent.click(container.querySelector('[data-action="add-visual-operation"]')!);
    });

    const operations = container.querySelectorAll<HTMLSelectElement>(
      '[data-slot="dvt-visual-operation-kind"]'
    );
    expect(operations).toHaveLength(2);
    expect(operations[1]?.value).toBe('trim');

    act(() => {
      fireEvent.change(operations[1]!, { target: { value: 'upper' } });
      fireEvent.click(container.querySelector('[data-action="add-visual-filter"]')!);
    });

    const resolvedDraft = JSON.parse(draftJson()) as {
      recipe: {
        outputs: Array<{ name: string; expression: { operations: Array<unknown> } }>;
        filters: Array<{ operator: string }>;
      };
    };
    expect(resolvedDraft.recipe.outputs[0]?.name).toBe('order_id');
    expect(resolvedDraft.recipe.outputs[0]?.expression.operations).toEqual([
      { kind: 'passthrough' },
      { kind: 'function', functionId: 'upper', args: [] },
    ]);
    expect(resolvedDraft.recipe.filters).toEqual([
      expect.objectContaining({ operator: 'is_not_null' }),
    ]);
  });

  it('localizes and reorders a multi-input recipe without persisting a second mapping', () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const baseSource = buildImportedWarehouseSourceNode();
    const source: CanonicalNode = {
      ...baseSource,
      metadata: {
        ...baseSource.metadata,
        columns: [
          { name: 'id', type: 'number' },
          { name: 'customer', type: 'text' },
        ],
      },
    };
    const transform = buildDvtNode('dvt:sql_transform', {
      transformAuthoring: {
        version: 'v1',
        mode: 'visual',
        recipe: {
          version: 'v1',
          outputs: [
            {
              id: 'output:id',
              name: 'id',
              dataType: 'number',
              expression: {
                inputs: [{ nodeId: source.id, columnName: 'id' }],
                operations: [
                  { kind: 'passthrough' },
                  { kind: 'function', functionId: 'trim', args: [] },
                  { kind: 'function', functionId: 'upper', args: [] },
                ],
              },
            },
          ],
          filters: [],
        },
      },
    });
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'source-transform',
        sourceId: source.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];
    renderFields(transform, undefined, undefined, [source, transform], edges, 'columns');

    expect(container.textContent).toContain('Receta visual');
    expect(container.textContent).not.toContain('Visual recipe');
    const inputCheckboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(inputCheckboxes).toHaveLength(2);

    act(() => {
      fireEvent.click(inputCheckboxes[1]!);
    });

    const moveUpButtons = container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Subir operación"]'
    );
    act(() => {
      fireEvent.click(moveUpButtons[2]!);
    });

    let resolvedDraft = JSON.parse(draftJson()) as {
      recipe: {
        outputs: Array<{
          expression: { inputs: Array<{ columnName: string }>; operations: Array<unknown> };
        }>;
      };
    };
    expect(resolvedDraft.recipe.outputs[0]?.expression.inputs).toEqual([
      expect.objectContaining({ columnName: 'id' }),
      expect.objectContaining({ columnName: 'customer' }),
    ]);
    expect(resolvedDraft.recipe.outputs[0]?.expression.operations).toEqual([
      { kind: 'function', functionId: 'concat', args: [' '] },
      { kind: 'function', functionId: 'upper', args: [] },
      { kind: 'function', functionId: 'trim', args: [] },
    ]);

    const excludeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Excluir salida'
    );
    act(() => {
      fireEvent.click(excludeButton!);
    });
    resolvedDraft = JSON.parse(draftJson()) as typeof resolvedDraft;
    expect(resolvedDraft.recipe.outputs).toEqual([]);
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
