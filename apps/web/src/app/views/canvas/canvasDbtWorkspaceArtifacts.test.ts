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
});
