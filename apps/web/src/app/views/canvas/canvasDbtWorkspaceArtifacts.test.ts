import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';

const sourceNode: CanonicalNode = {
  id: 'source-orders',
  name: 'Raw Orders',
  pluginId: 'dbt',
  kind: 'dbt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: {
      packageName: 'analytics',
      sourceName: 'raw',
      schemaName: 'raw',
      tableName: 'orders',
    },
    columns: [
      { name: 'order_id', type: 'bigint' },
      { name: 'customer', type: 'text' },
    ],
  },
};

const modelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders Model',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {
    dbt: {
      packageName: 'analytics',
      materialized: 'table',
      selectedSourceId: 'source-orders',
    },
  },
};

const sourceEdge: CanonicalEdge = {
  id: 'edge-source-model',
  sourceId: 'source-orders',
  targetId: 'model-orders',
  relation: 'lineage',
};

const testNode: CanonicalNode = {
  id: 'test-orders-key',
  name: 'Orders key required',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'idle',
  tags: [],
  metadata: {
    dbtTest: {
      testType: 'not_null',
      targetModelId: modelNode.id,
      targetColumn: 'order_id',
      severity: 'error',
    },
  },
};

const testEdge: CanonicalEdge = {
  id: 'edge-model-test',
  sourceId: modelNode.id,
  targetId: testNode.id,
  relation: 'validation',
};

describe('canvas dbt workspace artifacts', () => {
  it('publishes an object-file staging relation into executable DBT workspace artifacts', () => {
    const objectFileLoad: CanonicalNode = {
      id: 'load-orders',
      name: 'Load orders',
      pluginId: 'dvt.object-file-postgres',
      kind: 'dvt:object_file_load',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        objectFilePostgres: {
          source: {
            storageUri: `s3://fixtures/tenants/tenant/${'a'.repeat(64)}`,
            sha256: 'a'.repeat(64),
            sizeBytes: 62,
            maxBytes: 1_000,
            encoding: 'utf-8',
            format: 'csv',
            mediaType: 'text/csv',
            header: true,
            delimiter: ',',
            credentialRef: 'object-store:fixture',
          },
          target: {
            dialect: 'postgres',
            schema: 'staging',
            relation: 'orders',
            loadMode: 'replace',
            credentialRef: 'postgres:target',
          },
          columns: [
            {
              sourceField: 'order_id',
              targetColumn: 'order_id',
              dataType: 'bigint',
              nullable: false,
            },
          ],
        },
      },
    };
    const modelFromObject: CanonicalNode = {
      ...modelNode,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
          selectedSourceId: objectFileLoad.id,
        },
      },
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [objectFileLoad, modelFromObject],
      edges: [{ ...sourceEdge, sourceId: objectFileLoad.id }],
      scopedNodeIds: [objectFileLoad.id, modelFromObject.id],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.artifacts[1]?.content).toContain("from {{ source('staging', 'orders') }}");
    expect(result.artifacts[2]?.content).toContain('  - name: staging');
    expect(result.artifacts[2]?.content).toContain(
      `    schema: "{{ env_var('DVT_OBJECT_FILE_POSTGRES_STAGING_SCHEMA', 'staging') }}"`
    );
    expect(result.artifacts[2]?.content).toContain('      - name: orders');
  });

  it('projects imported warehouse sources into dbt source artifacts for connected models', () => {
    const warehouseSourceNode: CanonicalNode = {
      id: 'warehouse-orders',
      name: 'Imported Orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-prod',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/erp/orders',
        },
        sourceName: 'warehouse_prod_analytics_erp',
        schema: 'erp',
        tableName: 'orders',
        columns: [
          { name: 'order_id', type: 'bigint' },
          { name: 'customer', type: 'text' },
        ],
      },
    };
    const modelFromWarehouse: CanonicalNode = {
      ...modelNode,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
          selectedSourceId: 'warehouse-orders',
        },
      },
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [warehouseSourceNode, modelFromWarehouse],
      edges: [{ ...sourceEdge, sourceId: 'warehouse-orders' }],
      scopedNodeIds: ['warehouse-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[1]?.content).toContain('origin."order_id" as "order_id"');
    expect(result.artifacts[1]?.content).toContain(
      "from {{ source('warehouse_prod_analytics_erp', 'orders') }}"
    );
    expect(result.artifacts[2]?.content).toContain('  - name: warehouse_prod_analytics_erp');
    expect(result.artifacts[2]?.content).toContain('    schema: erp');
    expect(result.artifacts[2]?.content).toContain('      - name: orders');
  });

  it('generates deterministic dbt project files from the authored graph', () => {
    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, modelNode],
      edges: [sourceEdge],
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts.map((artifact) => artifact.path)).toEqual([
      'dbt_project.yml',
      'models/orders_model.sql',
      'models/schema.yml',
    ]);
    expect(result.artifacts[1]?.content).toContain("{{ config(materialized='table') }}");
    expect(result.artifacts[1]?.content).toContain("{{ source('raw', 'orders') }}");
    expect(result.artifacts[2]?.content).toContain('sources:');
    expect(result.artifacts[2]?.content).toContain('  - name: raw');
    expect(result.artifacts[2]?.content).toContain('      - name: orders');
    expect(result.artifacts[2]?.content).toContain('models:');
    expect(result.artifacts[2]?.content).toContain('  - name: orders_model');
  });

  it('blocks artifact generation when a model has no connected source or model origin', () => {
    expect(
      buildDbtWorkspaceArtifacts({
        nodes: [sourceNode, modelNode],
        edges: [],
        scopedNodeIds: ['source-orders', 'model-orders'],
      })
    ).toEqual({
      ok: false,
      message: 'DBT model "Orders Model" must select a connected source or model origin.',
    });
  });

  it('generates model SQL from the selected dbt origin instead of requiring core SQL metadata', () => {
    const emptyModelNode: CanonicalNode = {
      ...modelNode,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'table',
          selectedSourceId: 'source-orders',
        },
      },
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, emptyModelNode],
      edges: [sourceEdge],
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[1]?.content).toContain('origin."order_id" as "order_id"');
    expect(result.artifacts[1]?.content).toContain('origin."customer" as "customer"');
    expect(result.artifacts[1]?.content).toContain("from {{ source('raw', 'orders') }} as origin");
    expect(result.artifacts[1]?.content).not.toContain('select *');
  });

  it('regenerates executable SQL instead of adopting legacy model SQL metadata', () => {
    const legacySqlModel: CanonicalNode = {
      ...modelNode,
      metadata: {
        ...modelNode.metadata,
        config: {
          sql: "select order_id, amount\nfrom {{ source('raw', 'orders') }}",
        },
      },
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, legacySqlModel],
      edges: [sourceEdge],
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[1]?.content).toContain('origin."order_id" as "order_id"');
    expect(result.artifacts[1]?.content).toContain('origin."customer" as "customer"');
    expect(result.artifacts[1]?.content).not.toContain('select order_id, amount');
  });

  it('serializes free-form model descriptions as valid YAML scalars', () => {
    const describedModelNode: CanonicalNode = {
      ...modelNode,
      description: 'Revenue: by channel\nIncludes wholesale "partner" orders',
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, describedModelNode],
      edges: [sourceEdge],
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[2]?.content).toContain(
      '    description: "Revenue: by channel\\nIncludes wholesale \\"partner\\" orders"'
    );
  });

  it('publishes connected DBT tests with stable selectors into schema YAML', () => {
    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, modelNode, testNode],
      edges: [sourceEdge, testEdge],
      scopedNodeIds: [sourceNode.id, modelNode.id, testNode.id],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[2]?.content).toContain(
      [
        '    columns:',
        '      - name: order_id',
        '        data_tests:',
        '          - not_null:',
        '              name: test_orders_key',
        '              config:',
        '                severity: error',
      ].join('\n')
    );
  });

  it('blocks scoped DBT tests that do not resolve to a connected model', () => {
    expect(
      buildDbtWorkspaceArtifacts({
        nodes: [sourceNode, modelNode, testNode],
        edges: [sourceEdge],
        scopedNodeIds: [sourceNode.id, modelNode.id, testNode.id],
      })
    ).toEqual({
      ok: false,
      message: 'DBT test "Orders key required" targets a model that is not connected.',
    });
  });
});
