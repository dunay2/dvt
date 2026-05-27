import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDbtNodeAuthoringMetadata,
  createDbtNodeAuthoringMetadata,
  resolveDbtSourceRelationshipSelection,
} from './canvasDbtAuthoringModel';

function buildDbtSourceNode(): CanonicalNode {
  return {
    id: 'source-orders',
    name: 'Raw Orders',
    pluginId: 'dbt',
    kind: 'dbt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: {
      dbt: {
        packageName: 'analytics',
        sourceName: 'raw',
        schemaName: 'raw',
        tableName: 'orders',
      },
    },
  };
}

function buildDbtModelNode(): CanonicalNode {
  return {
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
        materialized: 'view',
        selectedSourceId: 'source-orders',
      },
    },
  };
}

function buildSourceEdge(): CanonicalEdge {
  return {
    id: 'edge-source-model',
    sourceId: 'source-orders',
    targetId: 'model-orders',
    relation: 'lineage',
  };
}

describe('canvas dbt authoring model', () => {
  it('projects dbt source metadata into a route-owned authoring value object', () => {
    expect(createDbtNodeAuthoringMetadata(buildDbtSourceNode())).toEqual({
      packageName: 'analytics',
      sourceName: 'raw',
      schemaName: 'raw',
      tableName: 'orders',
      materialized: 'view',
      selectedSourceId: '',
    });
  });

  it('applies dbt model config without losing existing canonical node metadata', () => {
    const model = buildDbtModelNode();

    expect(
      applyDbtNodeAuthoringMetadata(model, {
        packageName: 'analytics',
        sourceName: 'raw',
        schemaName: 'raw',
        tableName: 'orders',
        materialized: 'table',
        selectedSourceId: 'source-orders',
      })
    ).toEqual({
      ...model,
      metadata: {
        ...model.metadata,
        config: {
          materialized: 'table',
        },
        dbt: {
          packageName: 'analytics',
          sourceName: 'raw',
          schemaName: 'raw',
          tableName: 'orders',
          materialized: 'table',
          selectedSourceId: 'source-orders',
        },
      },
    });
  });

  it('resolves the selected model origin from the visible dbt graph relation', () => {
    expect(
      resolveDbtSourceRelationshipSelection({
        node: buildDbtModelNode(),
        nodes: [buildDbtSourceNode(), buildDbtModelNode()],
        edges: [buildSourceEdge()],
      })
    ).toEqual({
      status: 'selected',
      sourceNodeId: 'source-orders',
      sourceName: 'raw',
      tableName: 'orders',
    });
  });

  it('fails closed when a dbt model selects a source that is not connected in the graph', () => {
    expect(
      resolveDbtSourceRelationshipSelection({
        node: buildDbtModelNode(),
        nodes: [buildDbtSourceNode(), buildDbtModelNode()],
        edges: [],
      })
    ).toEqual({
      status: 'blocked',
      reason: 'selected_source_not_connected',
    });
  });
});
