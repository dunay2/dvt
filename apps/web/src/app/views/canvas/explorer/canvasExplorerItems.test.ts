/** Owned concern: navigation projections preserve node identity without changing graph data. */
import { describe, expect, it } from 'vitest';
import { projectCanvasExplorerModels, mergeCanvasExplorerModels } from './canvasExplorerItems';
import type { CanonicalNode } from '../../../types/canonical';

describe('Canvas explorer node projection', () => {
  it('lists logical models and keeps the Source facet independent of connection and input role', () => {
    // A role-only Sources section hid logical models and incorrectly classified seeds as Sources.
    const base: CanonicalNode = {
      id: 'logical',
      name: 'Logical model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const catalogue: CanonicalNode[] = [
      base,
      { ...base, id: 'unbound-source', kind: 'dvt:source', role: 'input' },
      { ...base, id: 'seed', kind: 'dbt:seed', role: 'input', metadata: { resourceType: 'seed' } },
      {
        ...base,
        id: 'legacy-seed',
        kind: 'dvt:source',
        role: 'input',
        metadata: { resourceType: 'seed' },
      },
      {
        ...base,
        id: 'sql-model',
        metadata: {
          sql: 'select * from source',
          connectionName: 'Warehouse',
          resourceType: 'model',
        },
      },
    ];
    const before = JSON.stringify(catalogue);
    const items = projectCanvasExplorerModels(catalogue);
    expect(items.map((item) => item.id)).toEqual(catalogue.map((node) => node.id));
    expect(items.map((item) => item.isSource)).toEqual([false, true, false, false, false]);
    expect(items[0]?.details?.some((detail) => detail.label === 'connection')).toBe(false);
    expect(JSON.stringify(catalogue)).toBe(before);
  });

  it('projects approved metadata for search without SQL or private configuration', () => {
    // Search must find metadata without inspecting executable text or leaking credential fields.
    const node: CanonicalNode = {
      id: 'orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['finance'],
      path: 'models/orders.yml',
      description: 'Order intake',
      metadata: {
        schema: 'raw',
        tableIdentifier: 'purchase_orders',
        database: 'warehouse',
        connectionName: 'Production warehouse',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse-id',
        },
        sql: 'PRIVATE_SQL_SENTINEL',
        credentialRef: 'PRIVATE_CREDENTIAL_SENTINEL',
      },
    };
    const item = projectCanvasExplorerModels([node])[0]!;
    expect(item.details).toEqual(
      expect.arrayContaining([
        { label: 'schema', value: 'raw' },
        { label: 'object', value: 'purchase_orders' },
        { label: 'connection', value: 'Production warehouse' },
      ])
    );
    expect(item.searchText).toContain('purchase_orders');
    expect(item.searchText).toContain('warehouse-id');
    expect(item.searchText).toContain('Order intake');
    expect(item.description).toBe('raw · Production warehouse');
    expect(item.searchText).not.toContain('PRIVATE_');
  });

  it('projects definitions with useful context, preserving order and duplicate labels', () => {
    const source: CanonicalNode = {
      id: 'first',
      name: 'Orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { schema: ' raw ', connectionName: ' Warehouse ' },
    };
    const catalogue: CanonicalNode[] = [
      source,
      { ...source, id: 'placed', sourceDefinitionId: source.id, metadata: undefined },
      { ...source, id: 'second', metadata: { schema: 42, connectionName: '   ' } },
      { ...source, id: 'third', metadata: { connectionName: 'Other warehouse' } },
      { ...source, id: 'transform', role: 'transform', kind: 'dvt:transform', pluginId: 'dvt' },
    ];
    const before = JSON.stringify(catalogue);
    const items = projectCanvasExplorerModels(catalogue);
    expect(items.map((item) => item.id)).toEqual(['first', 'second', 'third', 'transform']);
    expect(items.every((item) => item.label === 'Orders')).toBe(true);
    expect(items.map((item) => item.isSource)).toEqual([true, true, true, false]);
    expect(items[0]?.description).toBe('raw');
    expect(items[1]?.description).toBeUndefined();
    expect(JSON.stringify(catalogue)).toBe(before);
    expect(projectCanvasExplorerModels([])).toEqual([]);
  });

  it('retains the explicit Source facet when its connection binding is malformed', () => {
    // Connection readiness must not erase the identity of an unbound or invalidly bound Source.
    const node: CanonicalNode = {
      id: 'source',
      name: 'Client',
      kind: 'dvt:source',
      pluginId: 'dvt',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { connectedSourceRef: { connectionRef: 'invalid' } },
    };
    const item = projectCanvasExplorerModels([node])[0]!;
    expect(item.isSource).toBe(true);
    expect(item.details?.some((detail) => detail.label === 'connection')).toBe(false);
  });

  it('retains the file path when a discovered Model becomes a registered definition', () => {
    // First placement must not replace a file Model's path with its execution connection.
    const node: CanonicalNode = {
      id: 'registered',
      name: 'Clientes',
      kind: 'dvt:transform',
      pluginId: 'dvt',
      role: 'transform',
      status: 'idle',
      tags: [],
      path: 'models/clientes.sql',
      metadata: {
        resourceType: 'model',
        dbtModelReference: {
          schemaVersion: 'workspace-dbt-model-reference.v1',
          canvasId: 'files',
          uniqueId: 'model.demo.clientes',
          relationId: 'clients-relation',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse',
          },
          fields: [
            { fieldId: 'client-field', name: 'client_id', dataType: 'text', nullable: true },
          ],
        },
      },
    };
    const direct = {
      ...node,
      id: 'direct-file',
      metadata: {
        authority: 'dbt-project-files',
        resourceType: 'model',
        dbtUniqueId: 'model.demo.clientes',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse',
        },
      },
    };
    const items = projectCanvasExplorerModels([node, direct], 'files');
    expect(items.map((item) => item.description)).toEqual([
      'models/clientes.sql',
      'models/clientes.sql',
    ]);
    expect(
      items.every((item) =>
        item.details?.some(
          (detail) => detail.label === 'connection' && detail.value === 'warehouse'
        )
      )
    ).toBe(true);
    expect(items.every((item) => item.searchText?.includes('warehouse'))).toBe(true);
  });

  it('qualifies direct file definitions with their explicit Canvas owner only', () => {
    // A native identifier that resembles a dbt uniqueId must not acquire another project's identity.
    const node: CanonicalNode = {
      id: 'model.demo.orders',
      name: 'Orders',
      kind: 'dvt:transform',
      pluginId: 'dvt',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        authority: 'dbt-project-files',
        resourceType: 'model',
        dbtUniqueId: 'model.demo.orders',
      },
    };
    expect(projectCanvasExplorerModels([node])[0]?.definitionIdentity).toBeUndefined();
    expect(projectCanvasExplorerModels([node], 'file-owner')[0]?.definitionIdentity).toEqual({
      canvasId: 'file-owner',
      uniqueId: 'model.demo.orders',
    });
    expect(
      projectCanvasExplorerModels(
        [{ ...node, metadata: { dbtUniqueId: 'model.demo.orders' } }],
        'file-owner'
      )[0]?.definitionIdentity
    ).toBeUndefined();
  });

  it('merges one scoped file definition without merging duplicate labels or cross-Canvas resources', () => {
    // Definitions and placements are distinct; a display name is never a deduplication key.
    const registered = [
      { id: 'native', label: 'Orders' },
      {
        id: 'raw-file-id',
        label: 'Orders',
        definitionIdentity: { canvasId: 'a', uniqueId: 'model.demo.orders' },
      },
    ];
    const discovered = [
      {
        id: 'reference-id',
        label: 'Orders',
        definitionIdentity: { canvasId: 'a', uniqueId: 'model.demo.orders' },
      },
      {
        id: 'other-reference',
        label: 'Orders',
        definitionIdentity: { canvasId: 'b', uniqueId: 'model.demo.orders' },
      },
    ];
    const before = JSON.stringify([registered, discovered]);
    expect(mergeCanvasExplorerModels(registered, discovered).map((item) => item.id)).toEqual([
      'native',
      'raw-file-id',
      'other-reference',
    ]);
    expect(JSON.stringify([registered, discovered])).toBe(before);
  });
});
