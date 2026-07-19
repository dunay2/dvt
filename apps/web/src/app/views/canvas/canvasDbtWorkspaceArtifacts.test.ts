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

describe('canvas dbt workspace artifacts', () => {
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
        sourceName: 'warehouse_prod_analytics_erp',
        schema: 'erp',
        tableName: 'orders',
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
      message: 'DBT model "Orders Model" must be connected to a source or model origin.',
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

    expect(result.artifacts[1]?.content).toContain('select *');
    expect(result.artifacts[1]?.content).toContain("from {{ source('raw', 'orders') }}");
  });

  it('uses authored model SQL as the executable workspace artifact body', () => {
    const authoredModel: CanonicalNode = {
      ...modelNode,
      metadata: {
        ...modelNode.metadata,
        config: {
          sql: "select order_id, amount\nfrom {{ source('raw', 'orders') }}",
        },
      },
    };

    const result = buildDbtWorkspaceArtifacts({
      nodes: [sourceNode, authoredModel],
      edges: [sourceEdge],
      scopedNodeIds: ['source-orders', 'model-orders'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifacts[1]?.content).toBe(
      "{{ config(materialized='table') }}\n\nselect order_id, amount\nfrom {{ source('raw', 'orders') }}\n"
    );
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
});
