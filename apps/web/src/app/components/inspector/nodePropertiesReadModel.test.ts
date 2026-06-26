import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  buildNodePropertiesReadModel,
  type NodePropertiesReadModel,
  type NodePropertySection,
} from './nodePropertiesReadModel';

const expectedSectionIds = [
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
] as const;

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

function buildSourceNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
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
      rowCount: 1500,
      byteSize: 4096000,
      owner: 'data-platform',
      sql: 'select * from analytics.raw.orders',
      columns: [
        {
          name: 'order_id',
          type: 'number',
          nullable: false,
          primaryKey: true,
          description: 'Warehouse order identifier',
        },
        { name: 'customer_id', type: 'number', nullable: false },
      ],
      indexes: [{ name: 'idx_orders_customer', type: 'btree', columns: ['customer_id'] }],
      foreignKeys: [
        {
          name: 'fk_orders_customer',
          localColumns: ['customer_id'],
          referencedTable: 'customers',
          referencedColumns: ['customer_id'],
        },
      ],
      constraints: [{ name: 'ck_orders_amount', expression: 'amount >= 0' }],
    },
    ...overrides,
  };
}

function buildSourceModel(node = buildSourceNode()): NodePropertiesReadModel {
  return buildNodePropertiesReadModel({
    node,
    nodes: [node, downstreamNode],
    edges: graphEdges,
  });
}

function sectionById(model: NodePropertiesReadModel, id: string): NodePropertySection {
  const section = model.sections.find((candidate) => candidate.id === id);
  expect(section, `missing section ${id}`).toBeDefined();
  return section!;
}

function expectRows(section: NodePropertySection, expected: Record<string, string>): void {
  for (const [label, value] of Object.entries(expected)) {
    expect(section.rows.find((row) => row.label === label)?.value).toBe(value);
  }
}

function expectTableCells(
  section: NodePropertySection,
  id: string,
  expected: Record<string, string>
): void {
  expect(section.tableRows.find((row) => row.id === id)?.cells).toMatchObject(expected);
}

describe('nodePropertiesReadModel', () => {
  it('projects source metadata into table-modeler sections', () => {
    const model = buildSourceModel();

    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([...expectedSectionIds])
    );
    expect(new Set(model.sections.map((section) => section.id)).size).toBe(
      expectedSectionIds.length
    );

    expectRows(sectionById(model, 'general'), {
      Schema: 'raw',
      Table: 'orders',
      Rows: '1,500',
      Size: '3.9 MB',
      Path: 'models/sources/src_orders.yml',
    });
    expectRows(sectionById(model, 'summary'), {
      'Upstream nodes': '0',
      'Downstream nodes': 'Clean Orders',
      Tags: 'source, raw',
    });

    expectTableCells(sectionById(model, 'columns'), 'order_id', {
      name: 'order_id',
      type: 'number',
      nullable: 'not null',
      key: 'PK',
      comment: 'Warehouse order identifier',
    });
    expectTableCells(sectionById(model, 'columns'), 'customer_id', {
      name: 'customer_id',
      type: 'number',
      nullable: 'not null',
    });
    expectTableCells(sectionById(model, 'keys'), 'pk:order_id', {
      columns: 'order_id',
      type: 'primary',
    });
    expectTableCells(sectionById(model, 'indexes'), 'idx_orders_customer', {
      columns: 'customer_id',
      unique: 'no',
    });
    expectTableCells(sectionById(model, 'foreign-keys'), 'fk_orders_customer', {
      localColumns: 'customer_id',
      referencedTable: 'customers',
    });
    expectTableCells(sectionById(model, 'constraints'), 'ck_orders_amount', {
      expression: 'amount >= 0',
    });
    expectTableCells(sectionById(model, 'inputs-outputs'), 'output:edge-source-transform', {
      direction: 'Output',
      node: 'Clean Orders',
      relation: 'lineage',
    });
    expect(sectionById(model, 'code').code).toBe('select * from analytics.raw.orders');
  });

  it('keeps the expected table-modeler section vocabulary without requiring records', () => {
    const model = buildNodePropertiesReadModel({
      node: buildSourceNode(),
      nodes: [buildSourceNode()],
      edges: [],
    });

    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([...expectedSectionIds])
    );
  });

  it.each(['columns', 'indexes', 'constraints', 'keys', 'foreign-keys', 'tests'] as const)(
    'renders explicit empty state for %s instead of fabricated records',
    (sectionId) => {
      const model = buildNodePropertiesReadModel({
        node: buildSourceNode({ metadata: { columns: [] } }),
        nodes: [buildSourceNode()],
        edges: [],
      });
      const section = sectionById(model, sectionId);

      expect(section.tableRows).toEqual([]);
      expect(section.emptyState).toMatch(/\S/);
    }
  );

  it('projects dbt test target semantics without fabricating unavailable metadata', () => {
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

    expectTableCells(
      sectionById(buildNodePropertiesReadModel({ node, nodes: [node], edges: [] }), 'tests'),
      `test:${node.id}`,
      {
        name: 'not_null_orders_order_id',
        type: 'not_null',
        target: 'orders.order_id',
        column: 'order_id',
        severity: 'error',
      }
    );
  });

  it('projects dbt model columns and column tests from manifest-style metadata maps', () => {
    const node: CanonicalNode = {
      id: 'model-orders',
      name: 'fct_orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: ['mart'],
      metadata: {
        database: 'analytics',
        schema: 'mart',
        tableName: 'fct_orders',
        columns: {
          order_id: {
            data_type: 'integer',
            description: 'Primary order key',
            tests: [
              {
                not_null: {
                  severity: 'error',
                  selectedForExecution: true,
                  lastRunStatus: 'passed',
                  lastRunDurationMs: 1234,
                },
              },
              {
                unique: {
                  severity: 'error',
                  selectedForExecution: false,
                  lastRunStatus: 'failed',
                },
              },
            ],
          },
          status: {
            data_type: 'text',
            description: 'Lifecycle status',
            tests: [{ accepted_values: { values: ['created', 'paid'], severity: 'warn' } }],
          },
        },
      },
    };
    const model = buildNodePropertiesReadModel({ node, nodes: [node], edges: [] });

    expectTableCells(sectionById(model, 'columns'), 'order_id', {
      name: 'order_id',
      type: 'integer',
      comment: 'Primary order key',
    });
    expectTableCells(sectionById(model, 'columns'), 'status', {
      name: 'status',
      type: 'text',
      comment: 'Lifecycle status',
    });
    expectTableCells(sectionById(model, 'tests'), 'test:model-orders:order_id:not_null', {
      name: 'not_null(order_id)',
      type: 'not_null',
      target: 'fct_orders.order_id',
      column: 'order_id',
      severity: 'error',
      assertion: 'Value is present',
      selection: 'selected',
      readinessImpact: 'blocks run',
      lastRun: 'passed in 1.2s',
    });
    expectTableCells(sectionById(model, 'tests'), 'test:model-orders:order_id:unique', {
      name: 'unique(order_id)',
      type: 'unique',
      target: 'fct_orders.order_id',
      column: 'order_id',
      severity: 'error',
      assertion: 'Values are unique',
      selection: 'not selected',
      readinessImpact: 'blocks run',
      lastRun: 'failed',
    });
    expectTableCells(sectionById(model, 'tests'), 'test:model-orders:status:accepted_values', {
      name: 'accepted_values(status)',
      type: 'accepted_values',
      target: 'fct_orders.status',
      column: 'status',
      severity: 'warn',
      expression: 'values: created, paid',
      assertion: 'Value is one of created, paid',
      readinessImpact: 'warning',
    });
  });

  it.each([
    ['compiled SQL', { compiledSql: 'select compiled', sql: 'select metadata' }, 'select compiled'],
    [
      'metadata SQL',
      { sql: 'select metadata', config: { sql: 'select config' } },
      'select metadata',
    ],
    ['config SQL', { config: { sql: 'select config' } }, 'select config'],
  ])('uses deterministic SQL precedence for %s', (_name, metadata, expectedCode) => {
    const model = buildNodePropertiesReadModel({
      node: buildSourceNode({ metadata }),
      nodes: [buildSourceNode()],
      edges: [],
    });

    expect(sectionById(model, 'code').code).toBe(expectedCode);
  });
});
