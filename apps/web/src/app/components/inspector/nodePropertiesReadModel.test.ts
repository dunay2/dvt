import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasViewCopy } from '../../views/canvas/canvasCopyCatalog';
import { buildCanvasNodePresentationCopy } from '../../views/canvas/canvasNodePresentationCopy';
import {
  buildNodePropertiesReadModel,
  type NodePropertiesReadModel,
  type NodePropertySection,
} from './nodePropertiesReadModel';

const presentationCopy = {
  columnsLabel: 'Columns',
  declaredColumnsDetailTemplate: 'Inherited: 0 · Declared: {count}',
  inheritedColumnsDetailTemplate: 'Inherited: {count} · Declared: 0',
  mixedColumnsDetailTemplate: 'Inherited: {available} · Declared: {declared}',
  noColumnsDetail: 'Inherited: 0 · Declared: 0',
  codeLabel: 'Code',
  workspaceCodeDetailTemplate: 'Code lives at {path}.',
  generatedCodeDetailTemplate: 'Generated code at {path}.',
  codeUnavailableMessage: 'No code.',
} as const;

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
  kind: 'dvt:transform',
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
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-prod',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/analytics/raw/orders',
      },
      connectionName: 'Production warehouse',
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
    presentationCopy,
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
  it('projects every core Inspector section, row, column, value, and empty state in Spanish', () => {
    const node = buildSourceNode({ metadata: {} });
    const model = buildNodePropertiesReadModel({
      node,
      nodes: [node],
      edges: [],
      presentationCopy: buildCanvasNodePresentationCopy(resolveCanvasViewCopy('es'), 'es'),
    });

    expect(model.sections.map((section) => section.label)).toEqual([
      'General',
      'Columnas',
      'Entradas y salidas',
      'Pruebas',
      'Claves',
      'Índices',
      'Claves externas',
      'Restricciones',
      'Comentarios',
      'Código',
      'Resumen',
    ]);
    expect(sectionById(model, 'general').rows.map((row) => row.id)).not.toEqual(
      expect.arrayContaining(['node-id', 'kind', 'role', 'status', 'plugin'])
    );
    expect(sectionById(model, 'summary').rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node-id', label: 'ID del nodo' }),
        expect.objectContaining({ id: 'kind', label: 'Tipo' }),
        expect.objectContaining({ id: 'role', label: 'Rol' }),
        expect.objectContaining({ id: 'status', label: 'Estado', value: 'Inactivo' }),
        expect.objectContaining({ id: 'plugin', label: 'Plugin' }),
        expect.objectContaining({ id: 'tags', label: 'Etiquetas' }),
      ])
    );
    expect(sectionById(model, 'keys').emptyState).toBe('No hay claves registradas para este nodo.');
    expect(sectionById(model, 'columns').columnLabels).toMatchObject({
      name: 'Nombre',
      nullable: 'Admite nulos',
      reference: 'Referencia',
    });
    expect(sectionById(model, 'inputs-outputs').columnLabels).toMatchObject({
      direction: 'Dirección',
      node: 'Nodo',
      nodeId: 'ID del nodo',
      relation: 'Relación',
    });
  });

  it('projects source metadata into table-modeler sections', () => {
    const model = buildSourceModel();

    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([...expectedSectionIds])
    );
    expect(new Set(model.sections.map((section) => section.id)).size).toBe(
      expectedSectionIds.length
    );

    expectRows(sectionById(model, 'general'), {
      Connection: 'Production warehouse · postgres · warehouse-prod',
      Schema: 'raw',
      Table: 'orders',
      Path: 'models/sources/src_orders.yml',
    });
    expect(sectionById(model, 'general').rows.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['rows', 'size'])
    );
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
    expect(sectionById(model, 'code')).toMatchObject({
      description: 'Code lives at models/sources/src_orders.yml.',
    });
    expect(sectionById(model, 'code').code).toBeUndefined();
  });

  it.each([
    { locale: 'en', connectionLabel: 'Connection' },
    { locale: 'es', connectionLabel: 'Conexión' },
  ])(
    'projects inherited transform connection context in Inputs / Outputs for $locale',
    ({ locale, connectionLabel }) => {
      const source = buildSourceNode();
      const model = buildNodePropertiesReadModel({
        node: downstreamNode,
        nodes: [source, downstreamNode],
        edges: graphEdges,
        presentationCopy: buildCanvasNodePresentationCopy(resolveCanvasViewCopy(locale), locale),
      });
      const inputsOutputs = sectionById(model, 'inputs-outputs');

      expect(inputsOutputs.columnLabels).toMatchObject({ connection: connectionLabel });
      expectTableCells(inputsOutputs, 'input:edge-source-transform', {
        direction: locale === 'es' ? 'Entrada' : 'Input',
        node: 'Orders Source',
        connection: 'postgres · warehouse-prod',
      });
    }
  );

  it('projects a fan-in transform connection once on the input branch that supplies it', () => {
    const primarySource = buildSourceNode();
    const secondarySource = buildSourceNode({
      id: 'src-returns',
      name: 'Returns Source',
      metadata: {
        ...buildSourceNode().metadata,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-secondary',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/analytics/raw/returns',
        },
      },
    });
    const fanInEdges: readonly CanonicalEdge[] = [
      graphEdges[0]!,
      {
        id: 'edge-returns-transform',
        sourceId: secondarySource.id,
        targetId: downstreamNode.id,
        relation: 'lineage',
      },
    ];
    const model = buildNodePropertiesReadModel({
      node: downstreamNode,
      nodes: [primarySource, secondarySource, downstreamNode],
      edges: fanInEdges,
      presentationCopy,
    });
    const inputsOutputs = sectionById(model, 'inputs-outputs');

    expectTableCells(inputsOutputs, 'input:edge-source-transform', {
      node: 'Orders Source',
    });
    expect(
      inputsOutputs.tableRows.find((row) => row.id === 'input:edge-source-transform')?.cells
    ).not.toHaveProperty('connection');
    expectTableCells(inputsOutputs, 'input:edge-returns-transform', {
      node: 'Returns Source',
      connection: 'postgres · warehouse-secondary',
    });
    expect(
      inputsOutputs.tableRows.filter((row) => row.cells.connection !== undefined)
    ).toHaveLength(1);
  });

  it.each([
    { locale: 'en', label: 'Connection' },
    { locale: 'es', label: 'Conexión' },
  ])('exposes the complete read-only connection binding in $locale', ({ locale, label }) => {
    const node = buildSourceNode();
    const model = buildNodePropertiesReadModel({
      node,
      nodes: [node],
      edges: [],
      presentationCopy: buildCanvasNodePresentationCopy(resolveCanvasViewCopy(locale), locale),
    });

    expect(sectionById(model, 'general').rows).toContainEqual({
      id: 'connection',
      label,
      value: 'Production warehouse · postgres · warehouse-prod',
    });
  });

  it('does not infer a connection binding from legacy loose metadata', () => {
    const node = buildSourceNode({
      metadata: {
        connectionName: 'Production warehouse',
        sourceObjectId: 'relation/analytics/raw/orders',
      },
    });

    expect(sectionById(buildSourceModel(node), 'general').rows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'connection' })])
    );
  });

  it('keeps source operational metrics out of general properties when evidence exists', () => {
    const model = buildSourceModel(
      buildSourceNode({
        metadata: {
          sourceName: 'warehouse_prod_analytics_raw',
          database: 'analytics',
          schema: 'raw',
          tableName: 'orders',
          sourceMetricEvidence: {
            observedAt: '2026-07-10T21:00:00.000Z',
            observationScope: { kind: 'snapshot' },
            rowCount: {
              value: 1500,
              provenance: 'estimated',
              method: 'query-plan',
              confidence: 'low',
            },
            byteSize: {
              value: 102000,
              provenance: 'estimated',
              method: 'schema-width',
              confidence: 'low',
              basis: 'logical-payload',
            },
          },
        },
      })
    );

    const general = sectionById(model, 'general');
    expect(general.rows.map(({ id }) => id)).not.toEqual(expect.arrayContaining(['rows', 'size']));
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
        dbtTest: {
          targetModelId: 'orders',
          targetColumn: 'order_id',
          severity: 'error',
          testType: 'not_null',
        },
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

  it('falls back to canonical dbt test run status and duration when metadata omits them', () => {
    const node: CanonicalNode = {
      id: 'test-orders-unique',
      name: 'unique_orders_order_id',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'failed',
      lastDuration: 2.5,
      tags: [],
      metadata: {
        testTargetModel: 'orders',
        testTargetColumn: 'order_id',
        severity: 'error',
        testType: 'unique',
      },
    };

    expectTableCells(
      sectionById(buildNodePropertiesReadModel({ node, nodes: [node], edges: [] }), 'tests'),
      `test:${node.id}`,
      {
        lastRun: 'failed in 2.5s',
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
          customer_id: {
            data_type: 'integer',
            description: 'Customer foreign key',
            tests: [
              {
                relationships: {
                  arguments: {
                    to: "ref('dim_customers')",
                    field: 'customer_id',
                  },
                  severity: 'error',
                },
              },
            ],
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
    expectTableCells(sectionById(model, 'columns'), 'customer_id', {
      name: 'customer_id',
      type: 'integer',
      comment: 'Customer foreign key',
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
    expectTableCells(sectionById(model, 'tests'), 'test:model-orders:customer_id:relationships', {
      name: 'relationships(customer_id)',
      type: 'relationships',
      target: 'fct_orders.customer_id',
      column: 'customer_id',
      severity: 'error',
      expression: "ref('dim_customers').customer_id",
      assertion: "Value references ref('dim_customers').customer_id",
      readinessImpact: 'blocks run',
    });
  });

  it('projects connected downstream dbt test nodes for a selected model', () => {
    const modelNode: CanonicalNode = {
      id: 'model-orders',
      name: 'fct_orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        columns: {
          order_id: { data_type: 'integer' },
        },
      },
    };
    const testNode: CanonicalNode = {
      id: 'test-orders-order-id',
      name: 'not_null_orders_order_id',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'failed',
      lastDuration: 1.7,
      tags: [],
      metadata: {
        testType: 'not_null',
        testTargetColumn: 'order_id',
        severity: 'error',
        selectedForExecution: true,
      },
    };
    const edge: CanonicalEdge = {
      id: 'edge-model-test',
      sourceId: modelNode.id,
      targetId: testNode.id,
      relation: 'validation',
    };

    const model = buildNodePropertiesReadModel({
      node: modelNode,
      nodes: [modelNode, testNode],
      edges: [edge],
    });

    expectTableCells(sectionById(model, 'tests'), 'test:test-orders-order-id', {
      name: 'not_null_orders_order_id',
      type: 'not_null',
      target: 'fct_orders.order_id',
      column: 'order_id',
      severity: 'error',
      assertion: 'Value is present',
      selection: 'selected',
      readinessImpact: 'blocks run',
      lastRun: 'failed in 1.7s',
    });
  });

  it('does not infer connected dbt test type from unrelated metadata keys', () => {
    const modelNode: CanonicalNode = {
      id: 'model-orders',
      name: 'fct_orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const customTestNode: CanonicalNode = {
      id: 'test-orders-custom',
      name: 'accepted_values_orders_status',
      pluginId: 'dbt',
      kind: 'dbt:test',
      role: 'check',
      status: 'idle',
      tags: [],
      metadata: {
        package: 'analytics',
        dependencies: ['fct_orders'],
        severity: 'warn',
      },
    };
    const edge: CanonicalEdge = {
      id: 'edge-model-custom-test',
      sourceId: modelNode.id,
      targetId: customTestNode.id,
      relation: 'validation',
    };

    const model = buildNodePropertiesReadModel({
      node: modelNode,
      nodes: [modelNode, customTestNode],
      edges: [edge],
    });

    expectTableCells(sectionById(model, 'tests'), 'test:test-orders-custom', {
      name: 'accepted_values_orders_status',
      type: '',
      target: 'fct_orders',
      severity: 'warn',
      assertion: '',
      readinessImpact: 'warning',
      lastRun: 'idle',
    });
  });

  it('projects DVT transform input columns as catalog availability without legacy selection truth', () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [
          { name: 'order_id', type: 'integer', nullable: false },
          { name: 'customer', type: 'text', nullable: true },
        ],
      },
    };
    const transform: CanonicalNode = {
      id: 'transform-orders',
      name: 'Clean orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const edge: CanonicalEdge = {
      id: 'edge-source-transform',
      sourceId: source.id,
      targetId: transform.id,
      relation: 'lineage',
    };

    const model = buildNodePropertiesReadModel({
      node: transform,
      nodes: [source, transform],
      edges: [edge],
    });

    expectTableCells(sectionById(model, 'columns'), 'source-orders.order_id', {
      name: 'order_id',
      type: 'integer',
      nullable: 'not null',
      source: 'Orders source',
      reference: 'source-orders.order_id',
      selection: 'available',
    });
    expectTableCells(sectionById(model, 'columns'), 'source-orders.customer', {
      name: 'customer',
      type: 'text',
      nullable: 'nullable',
      source: 'Orders source',
      reference: 'source-orders.customer',
      selection: 'available',
    });
  });

  it('shows the exact input reference for a declared direct Transform output', () => {
    const transform: CanonicalNode = {
      id: 'transform-orders',
      name: 'Transform orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };

    const model = buildNodePropertiesReadModel({
      node: transform,
      nodes: [transform],
      edges: [],
      presentationTruth: {
        columns: {
          declared: [
            {
              name: 'order_id',
              type: 'integer',
              nullable: false,
              provenance: 'declared',
              sourceNodeId: 'source-orders',
              sourceNodeName: 'Orders source',
              sourceReference: 'source-orders.order_id',
              reference: 'output:order_id',
            },
          ],
          inherited: [],
          visible: [
            {
              name: 'order_id',
              type: 'integer',
              nullable: false,
              provenance: 'declared',
              sourceNodeId: 'source-orders',
              sourceNodeName: 'Orders source',
              sourceReference: 'source-orders.order_id',
              reference: 'output:order_id',
            },
          ],
          declaredCount: 1,
          inheritedCount: 0,
          visibleCount: 1,
          visibleProvenance: 'declared',
        },
        code: { kind: 'unavailable' },
      },
    });

    expectTableCells(sectionById(model, 'columns'), 'output:order_id', {
      name: 'order_id',
      type: 'integer',
      nullable: 'not null',
      source: 'Orders source',
      reference: 'source-orders.order_id',
      selection: 'available',
    });
  });

  it('preserves declared Transform column details when no source lineage is projected', () => {
    const transform: CanonicalNode = {
      id: 'transform-sql-orders',
      name: 'SQL orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [
          {
            name: 'order_id',
            type: 'integer',
            nullable: false,
            primaryKey: true,
            defaultValue: '0',
            comment: 'Canonical order key',
          },
        ],
      },
    };

    const model = buildNodePropertiesReadModel({
      node: transform,
      nodes: [transform],
      edges: [],
    });
    const cells = sectionById(model, 'columns').tableRows.find(
      (row) => row.id === 'order_id'
    )?.cells;

    expect(cells).toMatchObject({
      name: 'order_id',
      type: 'integer',
      nullable: 'not null',
      key: 'PK',
      default: '0',
      comment: 'Canonical order key',
    });
    expect(cells).not.toHaveProperty('selection');
  });

  it('merges declared details and lineage per Transform output row', () => {
    const transform: CanonicalNode = {
      id: 'transform-partial-lineage',
      name: 'Partially sourced Transform',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [
          {
            name: 'order_id',
            type: 'integer',
            primaryKey: true,
            comment: 'Sourced order key',
          },
          {
            name: 'constant_label',
            type: 'text',
            defaultValue: "'unknown'",
            comment: 'Declared constant',
          },
        ],
      },
    };

    const model = buildNodePropertiesReadModel({
      node: transform,
      nodes: [transform],
      edges: [],
      presentationTruth: {
        columns: {
          declared: [
            {
              name: 'order_id',
              type: 'integer',
              provenance: 'declared',
              sourceNodeId: 'source-orders',
              sourceNodeName: 'Orders source',
              sourceReference: 'source-orders.order_id',
              reference: 'output:order_id',
            },
            {
              name: 'constant_label',
              type: 'text',
              provenance: 'declared',
              reference: 'output:constant_label',
            },
          ],
          inherited: [],
          visible: [
            {
              name: 'order_id',
              type: 'integer',
              provenance: 'declared',
              sourceNodeId: 'source-orders',
              sourceNodeName: 'Orders source',
              sourceReference: 'source-orders.order_id',
              reference: 'output:order_id',
            },
            {
              name: 'constant_label',
              type: 'text',
              provenance: 'declared',
              reference: 'output:constant_label',
            },
          ],
          declaredCount: 2,
          inheritedCount: 0,
          visibleCount: 2,
          visibleProvenance: 'declared',
        },
        code: { kind: 'unavailable' },
      },
    });
    const columnsSection = sectionById(model, 'columns');

    expectTableCells(columnsSection, 'output:order_id', {
      name: 'order_id',
      key: 'PK',
      comment: 'Sourced order key',
      source: 'Orders source',
      reference: 'source-orders.order_id',
      selection: 'available',
    });
    expectTableCells(columnsSection, 'output:constant_label', {
      name: 'constant_label',
      default: "'unknown'",
      comment: 'Declared constant',
    });
    expect(
      columnsSection.tableRows.find((row) => row.id === 'output:constant_label')?.cells
    ).not.toHaveProperty('selection');
  });

  it('projects DVT sink target and write policy into a dedicated sink section', () => {
    const sink: CanonicalNode = {
      id: 'sink-orders',
      name: 'Orders sink',
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: {
        config: {
          database: 'analytics',
          schema: 'mart',
          table: 'fct_orders',
          materialization: 'table',
          writeMode: 'replace',
          partitionStrategy: 'date_day',
        },
      },
    };

    const model = buildNodePropertiesReadModel({
      node: sink,
      nodes: [sink],
      edges: [],
    });

    expectRows(sectionById(model, 'sink'), {
      Destination: 'analytics.mart.fct_orders',
      Database: 'analytics',
      Schema: 'mart',
      Table: 'fct_orders',
      Materialization: 'table',
      'Write mode': 'replace',
      'Partition strategy': 'date_day',
    });
  });

  it('projects dbt inputs as catalog availability when catalog output is not recorded yet', () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'Orders source',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        columns: [
          { name: 'order_id', type: 'integer', nullable: false },
          { name: 'customer', type: 'text', nullable: true },
        ],
      },
    };
    const modelNode: CanonicalNode = {
      id: 'model-orders',
      name: 'Model orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      path: 'models/orders.sql',
      metadata: {},
    };
    const edge: CanonicalEdge = {
      id: 'edge-source-model',
      sourceId: source.id,
      targetId: modelNode.id,
      relation: 'lineage',
    };

    const model = buildNodePropertiesReadModel({
      node: modelNode,
      nodes: [source, modelNode],
      edges: [edge],
      presentationCopy,
    });

    expectTableCells(sectionById(model, 'columns'), 'source-orders.order_id', {
      name: 'order_id',
      type: 'integer',
      nullable: 'not null',
      source: 'Orders source',
      reference: 'source-orders.order_id',
      selection: 'available',
    });
    expectTableCells(sectionById(model, 'columns'), 'source-orders.customer', {
      name: 'customer',
      type: 'text',
      nullable: 'nullable',
      source: 'Orders source',
      reference: 'source-orders.customer',
      selection: 'available',
    });
    expect(sectionById(model, 'columns').description).toBe('Inherited: 2 · Declared: 0');
    const codeSection = sectionById(model, 'code');
    expect(codeSection).toMatchObject({
      label: 'Code',
      description: 'Code lives at models/orders.sql.',
    });
    expect(codeSection.emptyState).toBeUndefined();
    expect(codeSection.code).toBeUndefined();
  });

  it.each([
    [
      'compiled SQL',
      {
        compiledSql: 'select compiled',
        sql: 'select metadata',
        config: { sql: 'select config' },
      },
      'select compiled',
    ],
    [
      'config SQL over stale metadata SQL',
      { sql: 'select metadata', config: { sql: 'select config' } },
      'select config',
    ],
    ['metadata SQL fallback', { sql: 'select metadata' }, 'select metadata'],
  ])('uses deterministic SQL precedence for %s', (_name, metadata, expectedCode) => {
    const model = buildNodePropertiesReadModel({
      node: buildSourceNode({ path: undefined, metadata }),
      nodes: [buildSourceNode()],
      edges: [],
    });

    expect(sectionById(model, 'code').code).toBe(expectedCode);
  });

  it('renders supplied generated code without claiming workspace-file authority', () => {
    const node = buildSourceNode({ path: undefined, metadata: {} });
    const model = buildNodePropertiesReadModel({
      node,
      nodes: [node],
      edges: [],
      presentationCopy,
      presentationTruth: {
        columns: {
          declared: [],
          inherited: [],
          visible: [],
          declaredCount: 0,
          inheritedCount: 0,
          visibleCount: 0,
          visibleProvenance: 'none',
        },
        code: {
          kind: 'generated',
          content: 'select * from raw_orders',
          path: 'models/orders.sql',
          language: 'sql',
        },
      },
    });

    expect(sectionById(model, 'code')).toMatchObject({
      code: 'select * from raw_orders',
      codeLanguage: 'sql',
      codePath: 'models/orders.sql',
      description: 'Generated code at models/orders.sql.',
    });
  });

  it('renders canonical Substrait code with digest provenance in Spanish', () => {
    const copy = buildCanvasNodePresentationCopy(resolveCanvasViewCopy('es-ES'), 'es-ES');
    const model = buildNodePropertiesReadModel({
      node: downstreamNode,
      nodes: [downstreamNode],
      edges: [],
      presentationCopy: copy,
      presentationTruth: {
        columns: {
          declared: [],
          inherited: [],
          visible: [],
          declaredCount: 0,
          inheritedCount: 0,
          visibleCount: 0,
          visibleProvenance: 'none',
        },
        code: {
          kind: 'canonical',
          content: '{"schemaVersion":"dvt-substrait-semantic-document.v1"}',
          language: 'json',
          schemaVersion: 'dvt-substrait-semantic-document.v1',
          digest: 'b'.repeat(64),
        },
      },
    });

    expect(sectionById(model, 'code')).toMatchObject({
      code: '{"schemaVersion":"dvt-substrait-semantic-document.v1"}',
      codeLanguage: 'json',
      description: `Documento Substrait canónico dvt-substrait-semantic-document.v1 · SHA-256 ${'b'.repeat(64)}`,
    });
  });

  it('explains invalid canonical Substrait evidence instead of falling back to SQL', () => {
    const copy = buildCanvasNodePresentationCopy(resolveCanvasViewCopy('en-US'), 'en-US');
    const model = buildNodePropertiesReadModel({
      node: downstreamNode,
      nodes: [downstreamNode],
      edges: [],
      presentationCopy: copy,
      presentationTruth: {
        columns: {
          declared: [],
          inherited: [],
          visible: [],
          declaredCount: 0,
          inheritedCount: 0,
          visibleCount: 0,
          visibleProvenance: 'none',
        },
        code: {
          kind: 'unavailable',
          reason: 'invalid-canonical-substrait-document',
        },
      },
    });

    expect(sectionById(model, 'code').emptyState).toBe(
      'The canonical Substrait document is missing or invalid.'
    );
  });
});
