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
      config: {
        alias: 'orders_current',
      },
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
      modelSql: null,
    });
  });

  it('uses canonical config relation fields when duplicated dbt metadata is stale', () => {
    const model = buildDbtModelNode();

    expect(
      createDbtNodeAuthoringMetadata({
        ...model,
        metadata: {
          ...model.metadata,
          config: {
            schema: 'mart',
            table: 'orders_current',
          },
          dbt: {
            packageName: 'analytics',
            schemaName: 'raw',
            tableName: 'stale_orders',
            materialized: 'view',
          },
        },
      })
    ).toMatchObject({
      schemaName: 'mart',
      tableName: 'orders_current',
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
        modelSql: 'select order_id from raw.orders',
      })
    ).toEqual({
      ...model,
      metadata: {
        ...model.metadata,
        config: {
          alias: 'orders_current',
          schema: 'raw',
          table: 'orders',
          materialized: 'table',
          sql: 'select order_id from raw.orders',
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

  it('roundtrips authored model SQL through the canonical config metadata field', () => {
    const baseModel = buildDbtModelNode();
    const model = {
      ...baseModel,
      metadata: {
        ...baseModel.metadata,
        sql: 'select stale_order_id from legacy.orders',
      },
    };
    const updated = applyDbtNodeAuthoringMetadata(model, {
      ...createDbtNodeAuthoringMetadata(model),
      modelSql: 'select order_id, amount\nfrom raw.orders',
    });

    expect(updated.metadata?.config).toMatchObject({
      sql: 'select order_id, amount\nfrom raw.orders',
    });
    expect(createDbtNodeAuthoringMetadata(updated).modelSql).toBe(
      'select order_id, amount\nfrom raw.orders'
    );
    expect(updated.metadata).not.toHaveProperty('sql');
  });

  it('preserves authored SQL whitespace while distinguishing absent SQL from an empty edit', () => {
    const authoredSql = '  select order_id\nfrom raw.orders\n';
    const updated = applyDbtNodeAuthoringMetadata(buildDbtModelNode(), {
      ...createDbtNodeAuthoringMetadata(buildDbtModelNode()),
      modelSql: authoredSql,
    });

    expect(updated.metadata?.config).toMatchObject({ sql: authoredSql });
    expect(createDbtNodeAuthoringMetadata(updated).modelSql).toBe(authoredSql);

    const reset = applyDbtNodeAuthoringMetadata(updated, {
      ...createDbtNodeAuthoringMetadata(updated),
      modelSql: '',
    });
    expect(reset.metadata?.config).not.toHaveProperty('sql');
    expect(createDbtNodeAuthoringMetadata(reset).modelSql).toBeNull();
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
