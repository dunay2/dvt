// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import type { ConnectedSourceRef } from '@dvt/contracts';
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
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { DvtAuthoringFields } from './DvtAuthoringFields';

function buildDvtNode(
  kind: 'dvt:source' | 'dvt:transform' | 'dvt:sink',
  metadata?: Record<string, unknown>
): CanonicalNode {
  return {
    id: `dvt-${kind.replace('dvt:', '').replace('_', '-')}`,
    name: kind === 'dvt:transform' ? 'Clean Orders' : 'Orders',
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
    const aliasPresentations = [...container.querySelectorAll('span, label')].filter(
      (element) => element.textContent?.trim() === 'Alias'
    );

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
    expect(aliasPresentations).toHaveLength(1);
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

  it('keeps Transform filter controls out of a Source columns section', () => {
    const source = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer'],
    });
    renderFields(source, undefined, undefined, [source], [], 'columns');
    expect(draftJson()).not.toContain('"semantic"');
    expect(container.querySelector('[data-slot="dvt-filter-authoring"]')).toBeNull();
    expect(container.querySelector('select[name="dvt-filter-field"]')).toBeNull();
    expect(container.querySelector('input[name="dvt-filter-value"]')).toBeNull();
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
    const transform = buildDvtNode('dvt:transform');
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
      '[data-slot="dvt-start-configured-inner-join"]'
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
    expect(draftJson()).toContain('"shape":"inner_join"');
  });
  it('replaces a stale one-input projection with an explicitly configured connected join', () => {
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer'],
    });
    const audits = buildJoinWarehouseSourceNode({
      id: 'source-audits',
      table: 'auth_audit_events',
      columns: ['event_id', 'principal_id'],
    });
    const connectedSourceRef = orders.metadata?.connectedSourceRef;
    if (connectedSourceRef == null || typeof connectedSourceRef !== 'object') {
      throw new Error('Expected connected source reference.');
    }
    const transform = applyDvtSubstraitSemanticDocument(
      buildDvtNode('dvt:transform'),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: orders.id,
            schema: 'public',
            table: 'orders',
            sourceRef: connectedSourceRef as ConnectedSourceRef,
            fields: [
              { name: 'order_id', dataType: 'string' },
              { name: 'customer', dataType: 'string' },
            ],
          },
          targetNodeId: 'dvt-transform',
          outputs: [
            { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
            { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
          ],
        })
      )
    );
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'audits-transform',
        sourceId: audits.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(transform, undefined, undefined, [orders, audits, transform], edges, 'columns');

    const leftField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-left-field"]'
    );
    const rightField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-composition-right-field"]'
    );
    const startJoin = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-configured-inner-join"]'
    );
    expect(leftField).not.toBeNull();
    expect(rightField).not.toBeNull();
    expect(startJoin).not.toBeNull();

    act(() => {
      fireEvent.change(leftField!, {
        target: { value: `${orders.id}\u001fcustomer` },
      });
      fireEvent.change(rightField!, {
        target: { value: `${audits.id}\u001fprincipal_id` },
      });
      fireEvent.click(startJoin!);
    });

    expect(draftJson()).toContain('"shape":"inner_join"');
    expect(draftJson()).toMatch(/"fieldId":"dvt_fld_[^"]+"/);
    expect(draftJson()).not.toContain('"field:source-orders:customer"');
    expect(draftJson()).not.toContain('"field:source-audits:principal_id"');
    expect(
      container.querySelector('[data-slot="dvt-substrait-n-input-join-authoring"]')
    ).not.toBeNull();
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
    const transform = buildDvtNode('dvt:transform');
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
        container.querySelector<HTMLButtonElement>('[data-slot="dvt-start-configured-inner-join"]')!
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
    expect(draftJson()).toContain('"displayName":"shipment_id"');
    expect(
      container.querySelector('[data-slot="dvt-substrait-n-input-join-authoring"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('customers + orders + shipments');

    chooseConnectedField(tickets.id);
    expect(draftJson()).toContain('"displayName":"ticket_id"');
    expect(container.textContent).toContain('customers + orders + shipments + tickets');
    expect(draftJson()).toContain('dvt-vtx2-n-input-inner-join-card');

    chooseConnectedField(profiles.id);
    expect(draftJson()).toContain('"displayName":"profiles_name"');
    expect(container.textContent).toContain('customers + orders + shipments + tickets + profiles');

    const shipmentCustomerSelection = [
      ...container.querySelectorAll<HTMLInputElement>('input[name="dvt-substrait-n-input-field"]'),
    ].find((input) => input.getAttribute('aria-label')?.endsWith('shipments.customer_id'));
    expect(shipmentCustomerSelection).toBeDefined();
    expect(shipmentCustomerSelection?.checked).toBe(false);
    const shipmentCustomerFieldId = shipmentCustomerSelection!.value;
    expect(shipmentCustomerFieldId).toMatch(/^dvt_fld_/);
    act(() => {
      fireEvent.click(shipmentCustomerSelection!);
    });
    const shipmentCustomerOutput = [
      ...container.querySelectorAll<HTMLInputElement>(
        'input[data-slot="dvt-substrait-n-input-output-name"]'
      ),
    ].find((input) => input.dataset.sourceFieldId === shipmentCustomerFieldId);
    expect(shipmentCustomerOutput?.value).toBe('shipments_customer_id');
    const moveShipmentCustomerUp = [
      ...container.querySelectorAll<HTMLButtonElement>(
        'button[data-action="move-substrait-n-input-field-up"]'
      ),
    ].find((button) => button.dataset.sourceFieldId === shipmentCustomerFieldId);
    expect(moveShipmentCustomerUp).toBeDefined();
    act(() => {
      fireEvent.input(shipmentCustomerOutput!, { target: { value: 'shipping_customer' } });
      fireEvent.focusOut(shipmentCustomerOutput!);
      fireEvent.click(moveShipmentCustomerUp!);
    });
    expect(draftJson()).toContain('"displayName":"shipping_customer"');
    expect(draftJson()).not.toContain('field:dvt-transform:shipments_customer_id');

    const grainField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-inner-join-grain-field"]'
    );
    const countOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-inner-join-count-output-name"]'
    );
    const shipmentGrain = [...(grainField?.options ?? [])].find(
      (option) => option.textContent?.trim() === 'shipment_id'
    );
    expect(shipmentGrain?.value).toMatch(/^dvt_fld_/);
    act(() => {
      fireEvent.change(grainField!, {
        target: { value: shipmentGrain!.value },
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
    const transform = buildDvtNode('dvt:transform');
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

    expect(container.querySelector('[data-slot="dvt-start-configured-inner-join"]')).toBeNull();
  });

  it('starts one typed Substrait UNION ALL from N compatible connected datasets', () => {
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
    const west = buildJoinWarehouseSourceNode({
      id: 'source-customers-west',
      table: 'customers_west',
      columns: ['customer_id', 'name', 'country'],
    });
    const transform = buildDvtNode('dvt:transform');
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
      {
        id: 'west-transform',
        sourceId: west.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    renderFields(transform, undefined, undefined, [north, south, west, transform], edges, 'code');

    const entry = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-connected-union-all"]'
    );
    expect(entry).not.toBeNull();
    expect(container.querySelector('[data-slot="dvt-start-configured-inner-join"]')).not.toBeNull();

    act(() => {
      fireEvent.click(entry!);
    });

    expect(
      container.querySelector('[data-slot="dvt-substrait-union-all-authoring"]')
    ).not.toBeNull();
    expect(container.textContent).toContain('customers_north');
    expect(container.textContent).toContain('customers_south');
    expect(container.textContent).toContain('customers_west');
    expect(container.textContent).toContain('customer_id, name, country');
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
    expect(draftJson()).toContain('"displayName":"region"');
    expect(draftJson()).not.toContain('field:dvt-transform:country');

    const grainField = container.querySelector<HTMLSelectElement>(
      '[data-slot="dvt-substrait-union-all-grain-field"]'
    );
    const countOutput = container.querySelector<HTMLInputElement>(
      '[data-slot="dvt-substrait-union-all-count-output-name"]'
    );
    const applyGrouping = container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-substrait-union-all-apply-grouping"]'
    );
    const regionGrain = [...(grainField?.options ?? [])].find(
      (option) => option.textContent?.trim() === 'region'
    );
    expect(grainField).not.toBeNull();
    expect(countOutput).not.toBeNull();
    expect(regionGrain?.value).toMatch(/^dvt_fld_/);
    act(() => {
      fireEvent.change(grainField!, {
        target: { value: regionGrain!.value },
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
