/** Owned concern: navigation projections preserve node identity without changing graph data. */
import { describe, expect, it } from 'vitest';
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import {
  projectCanvasExplorerModels,
  projectCanvasExplorerFileModels,
  mergeCanvasExplorerModels,
} from './canvasExplorerItems';
import type { CanonicalNode } from '../../../types/canonical';

describe('Canvas explorer node projection', () => {
  it.each([
    { path: 'models/orders.sql', source: false, format: 'sql' },
    { path: 'models/ORDERS.SQL', source: true, format: 'sql' },
    { path: 'models/orders.sql.bak', source: false, format: undefined },
    { path: 'models/orders.yml', source: true, format: undefined },
    { path: undefined, source: false, format: undefined },
  ])(
    'derives the SQL file indicator from the actual path $path independently of Source',
    ({ path, source, format }) => {
      // A format label must not turn inline SQL or a plugin/resource name into a fictitious SQL file.
      const node: CanonicalNode = {
        id: 'model',
        name: 'orders.sql',
        description: 'SQL model in dbt.sql',
        pluginId: 'sql-plugin',
        kind: source ? 'dvt:source' : 'dbt:model',
        role: source ? 'input' : 'transform',
        status: 'idle',
        tags: [],
        ...(path == null ? {} : { path }),
        metadata: {
          resourceType: source ? 'source' : 'model',
          sql: 'select 1',
          path: 'guessed.sql',
        },
      };
      const before = JSON.stringify(node);
      const item = projectCanvasExplorerModels([node])[0]!;
      expect(item.definitionFormat).toBe(format);
      expect(item.isSource).toBe(source);
      expect(item.details?.find((detail) => detail.label === 'file')?.value).toBe(path);
      expect(JSON.stringify(node)).toBe(before);
    }
  );

  it('uses only the resolved accepted file publication path for a discovered SQL file indicator', () => {
    // Unbound file Models still list; a missing path cannot borrow one from its name or description.
    const projection = DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      adapterType: 'postgres',
      freshness: 'fresh',
      authorityBinding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'files',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
      },
      analysisSha256: 'a'.repeat(64),
      projectRevision: {
        projectRoot: 'analytics',
        projectName: 'demo',
        dbtVersion: '1.10.0',
        contentSetSha256: 'b'.repeat(64),
        analyzedAt: '2026-11-08T00:00:00.000Z',
        analyzerVersion: 'dbt-cli',
      },
      nodes: ['models/Orders.SQL', 'models/schema.yml', undefined].map(
        (originalFilePath, index) => ({
          uniqueId: `model.demo.model_${index}`,
          name: 'orders.sql',
          packageName: 'demo',
          resourceType: 'model',
          ...(originalFilePath == null ? {} : { originalFilePath }),
          description: 'inline.sql',
          columns: [],
          tags: [],
          visualEditability: { status: 'code_only', reasons: ['File authority'] },
        })
      ),
      edges: [],
      diagnostics: [],
      capabilities: { canPreview: false, canRun: false, codeOnlyResourceCount: 3 },
    });
    const before = JSON.stringify(projection);
    const items = projectCanvasExplorerFileModels(projection);
    expect(items.map((item) => item.definitionFormat)).toEqual(['sql', undefined, undefined]);
    expect(items[0]?.details).toContainEqual({
      label: 'file',
      value: 'analytics/models/Orders.SQL',
    });
    expect(items[0]?.searchText).toContain('analytics/models/Orders.SQL');
    expect(items.every((item) => item.isSource === false)).toBe(true);
    expect(JSON.stringify(projection)).toBe(before);
  });

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
