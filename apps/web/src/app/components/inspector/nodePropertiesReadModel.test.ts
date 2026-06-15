import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildNodePropertiesReadModel } from './nodePropertiesReadModel';

function buildSourceNode(): CanonicalNode {
  return {
    id: 'src-orders',
    name: 'Orders Source',
    description: 'Imported source for analytics.raw.orders',
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source', 'raw'],
    path: 'models/sources/src_orders.yml',
    metadata: {
      sourceName: 'warehouse_prod_analytics_raw',
      database: 'analytics',
      schema: 'raw',
      tableName: 'orders',
      owner: 'data-platform',
      columns: [
        {
          name: 'order_id',
          type: 'number',
          nullable: false,
          primaryKey: true,
          description: 'Warehouse order identifier',
        },
        {
          name: 'customer_id',
          type: 'number',
          nullable: false,
        },
      ],
      indexes: [
        {
          name: 'idx_orders_customer',
          type: 'btree',
          columns: ['customer_id'],
          unique: false,
        },
      ],
      foreignKeys: [
        {
          name: 'fk_orders_customer',
          localColumns: ['customer_id'],
          referencedTable: 'customers',
          referencedColumns: ['customer_id'],
        },
      ],
      constraints: [
        {
          name: 'ck_orders_amount',
          expression: 'amount >= 0',
        },
      ],
      sql: 'select * from analytics.raw.orders',
    },
  };
}

const downstreamNode: CanonicalNode = {
  id: 'transform-orders',
  name: 'Clean Orders',
  pluginId: 'dvt',
  kind: 'dvt:sql_transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const graphEdges: readonly CanonicalEdge[] = [
  {
    id: 'edge-source-transform',
    sourceId: 'src-orders',
    targetId: downstreamNode.id,
    relation: 'lineage',
  },
];

function sectionById(
  model: ReturnType<typeof buildNodePropertiesReadModel>,
  id: string
): ReturnType<typeof buildNodePropertiesReadModel>['sections'][number] {
  const section = model.sections.find((candidate) => candidate.id === id);
  expect(section, `missing section ${id}`).toBeDefined();
  return section!;
}

function rowValue(section: ReturnType<typeof sectionById>, label: string): string | undefined {
  return section.rows.find((row) => row.label === label)?.value;
}

function tableRowById(
  section: ReturnType<typeof sectionById>,
  id: string
): ReturnType<typeof sectionById>['tableRows'][number] | undefined {
  return section.tableRows.find((row) => row.id === id);
}

describe('nodePropertiesReadModel', () => {
  it('projects source metadata into SQL-Developer-style property sections', () => {
    const node = buildSourceNode();
    const model = buildNodePropertiesReadModel({
      node,
      nodes: [node, downstreamNode],
      edges: graphEdges,
    });

    const sectionIds = model.sections.map((section) => section.id);
    expect(sectionIds).toEqual(
      expect.arrayContaining([
        'general',
        'columns',
        'inputs-outputs',
        'tests',
        'keys',
        'indexes',
        'foreign-keys',
        'constraints',
        'comments',
        'code',
        'summary',
      ])
    );
    expect(new Set(sectionIds).size).toBe(sectionIds.length);

    const general = sectionById(model, 'general');
    expect(rowValue(general, 'Schema')).toBe('raw');
    expect(rowValue(general, 'Table')).toBe('orders');
    expect(rowValue(general, 'Path')).toBe('models/sources/src_orders.yml');

    const columns = sectionById(model, 'columns');
    expect(tableRowById(columns, 'order_id')?.cells).toMatchObject({
      name: 'order_id',
      type: 'number',
      nullable: 'not null',
      key: 'PK',
      comment: 'Warehouse order identifier',
    });
    expect(tableRowById(columns, 'customer_id')?.cells).toMatchObject({
      name: 'customer_id',
      type: 'number',
      nullable: 'not null',
    });

    const keys = sectionById(model, 'keys');
    expect(tableRowById(keys, 'pk:order_id')?.cells).toMatchObject({
      columns: 'order_id',
      type: 'primary',
    });

    expect(tableRowById(sectionById(model, 'indexes'), 'idx_orders_customer')?.cells).toMatchObject(
      {
        columns: 'customer_id',
        unique: 'no',
      }
    );
    expect(
      tableRowById(sectionById(model, 'foreign-keys'), 'fk_orders_customer')?.cells
    ).toMatchObject({
      localColumns: 'customer_id',
      referencedTable: 'customers',
    });
    expect(
      tableRowById(sectionById(model, 'constraints'), 'ck_orders_amount')?.cells
    ).toMatchObject({
      expression: 'amount >= 0',
    });

    expect(sectionById(model, 'code').code).toBe('select * from analytics.raw.orders');

    expect(
      tableRowById(sectionById(model, 'inputs-outputs'), 'output:edge-source-transform')?.cells
    ).toMatchObject({
      direction: 'Output',
      node: 'Clean Orders',
      relation: 'lineage',
    });
  });

  it('keeps the expected table-modeler section vocabulary without requiring records', () => {
    const model = buildNodePropertiesReadModel({
      node: buildSourceNode(),
      nodes: [buildSourceNode()],
      edges: [],
    });

    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([
        'general',
        'columns',
        'inputs-outputs',
        'tests',
        'keys',
        'indexes',
        'foreign-keys',
        'constraints',
        'comments',
        'code',
        'summary',
      ])
    );
  });

  it('renders explicit empty states instead of fabricated records', () => {
    const node: CanonicalNode = {
      ...buildSourceNode(),
      metadata: {
        columns: [],
      },
    };
    const model = buildNodePropertiesReadModel({ node, nodes: [node], edges: [] });

    for (const sectionId of ['columns', 'indexes', 'constraints'] as const) {
      const section = sectionById(model, sectionId);
      expect(section.tableRows).toEqual([]);
      expect(section.emptyState).toMatch(/\S/);
    }
    expect(sectionById(model, 'keys').tableRows).toEqual([]);
    expect(sectionById(model, 'foreign-keys').tableRows).toEqual([]);
    expect(sectionById(model, 'tests').emptyState).toMatch(/\S/);
  });

  it('projects dbt test semantics without fabricating unavailable metadata', () => {
    const node: CanonicalNode = {
      id: 'test-orders-order-id',
      name: 'not_null_orders_order_id',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'idle',
      tags: [],
      metadata: {
        testTargetModel: 'orders',
        testTargetColumn: 'order_id',
        severity: 'error',
        testType: 'not_null',
      },
    };

    expect(
      tableRowById(
        sectionById(buildNodePropertiesReadModel({ node, nodes: [node], edges: [] }), 'tests'),
        `test:${node.id}`
      )?.cells
    ).toMatchObject({
      name: 'not_null_orders_order_id',
      type: 'not_null',
      target: 'orders.order_id',
      column: 'order_id',
      severity: 'error',
    });
  });

  it('summarizes graph relationships without reading renderer state', () => {
    const model = buildNodePropertiesReadModel({
      node: buildSourceNode(),
      nodes: [buildSourceNode(), downstreamNode],
      edges: graphEdges,
    });

    const summary = sectionById(model, 'summary');
    expect(rowValue(summary, 'Upstream nodes')).toBe('0');
    expect(rowValue(summary, 'Downstream nodes')).toBe('Clean Orders');
    expect(rowValue(summary, 'Tags')).toBe('source, raw');
  });

  it('uses deterministic SQL precedence across compiled, metadata, and config SQL', () => {
    const node = buildSourceNode();

    expect(
      sectionById(
        buildNodePropertiesReadModel({
          node: {
            ...node,
            metadata: {
              compiledSql: 'select compiled',
              sql: 'select metadata',
              config: { sql: 'select config' },
            },
          },
          nodes: [node],
          edges: [],
        }),
        'code'
      ).code
    ).toBe('select compiled');

    expect(
      sectionById(
        buildNodePropertiesReadModel({
          node: {
            ...node,
            metadata: {
              sql: 'select metadata',
              config: { sql: 'select config' },
            },
          },
          nodes: [node],
          edges: [],
        }),
        'code'
      ).code
    ).toBe('select metadata');

    expect(
      sectionById(
        buildNodePropertiesReadModel({
          node: {
            ...node,
            metadata: {
              config: { sql: 'select config' },
            },
          },
          nodes: [node],
          edges: [],
        }),
        'code'
      ).code
    ).toBe('select config');
  });
});
