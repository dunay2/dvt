import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtVisualTransformRecipe,
  convertDvtVisualTransformToSql,
} from './canvasDvtTransformAuthoringAuthority';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  projectCanvasColumnLineage,
  resolveCanvasColumnPortDirections,
} from './canvasColumnLineageProjection';

function buildNode(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role'],
  columns: readonly Readonly<{ name: string; type: string }>[] = []
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
    metadata: { columns },
  };
}

describe('Canvas column lineage projection', () => {
  it('roundtrips encoded stable column handle identities', () => {
    const id = createCanvasColumnHandleId({
      direction: 'source',
      nodeId: 'source/one',
      columnId: 'Order ID',
    });

    expect(parseCanvasColumnHandleId(id)).toEqual({
      direction: 'source',
      nodeId: 'source/one',
      columnId: 'Order ID',
    });
    expect(parseCanvasColumnHandleId('node-output')).toBeNull();
  });

  it('assigns role-correct column port directions', () => {
    expect(resolveCanvasColumnPortDirections('input')).toEqual(['source']);
    expect(resolveCanvasColumnPortDirections('transform')).toEqual(['target', 'source']);
    expect(resolveCanvasColumnPortDirections('output')).toEqual(['target']);
    expect(resolveCanvasColumnPortDirections('check')).toEqual([]);
  });

  it('derives one source-to-model edge per recipe input only when both rows are disclosed', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
      { name: 'principal_id', type: 'text' },
    ]);
    const model = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:user_id',
            name: 'user_id',
            dataType: 'text',
            expression: {
              inputs: [{ nodeId: 'source', columnName: 'principal_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id, model.id]),
      })
    ).toEqual([
      expect.objectContaining({
        id: 'column-lineage:source:principal_id:model:output%3Auser_id',
        source: source.id,
        target: model.id,
        sourceHandle: createCanvasColumnHandleId({
          direction: 'source',
          nodeId: source.id,
          columnId: 'principal_id',
        }),
        targetHandle: createCanvasColumnHandleId({
          direction: 'target',
          nodeId: model.id,
          columnId: 'output:user_id',
        }),
        data: expect.objectContaining({ kind: 'column-lineage', outputId: 'output:user_id' }),
      }),
    ]);

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id]),
      })
    ).toEqual([]);
  });

  it('projects multi-input recipes without inventing a persisted mapping collection', () => {
    const first = buildNode('source-a', 'dvt:source', 'input', [
      { name: 'first_name', type: 'text' },
    ]);
    const second = buildNode('source-b', 'dvt:source', 'input', [
      { name: 'last_name', type: 'text' },
    ]);
    const model = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:full_name',
            name: 'full_name',
            dataType: 'text',
            expression: {
              inputs: [
                { nodeId: first.id, columnName: 'first_name' },
                { nodeId: second.id, columnName: 'last_name' },
              ],
              operations: [{ kind: 'function', functionId: 'concat', args: [' '] }],
            },
          },
        ],
        filters: [],
      }
    );

    const projected = projectCanvasColumnLineage({
      nodes: [first, second, model],
      edges: [
        { sourceId: first.id, targetId: model.id },
        { sourceId: second.id, targetId: model.id },
      ],
      expandedNodeIds: new Set([first.id, second.id, model.id]),
    });

    expect(projected).toHaveLength(2);
    expect(projected.map((edge) => edge.data?.sourceColumnName)).toEqual([
      'first_name',
      'last_name',
    ]);
  });

  it('preserves exact column lineage after transferring visual authority to SQL', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'order_id', type: 'integer' },
    ]);
    const visualModel = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:order_id',
            name: 'order_id',
            dataType: 'integer',
            expression: {
              inputs: [{ nodeId: source.id, columnName: 'order_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );
    const sqlModel = convertDvtVisualTransformToSql(
      visualModel,
      'select order_id from public.source_1'
    );

    expect(
      projectCanvasColumnLineage({
        nodes: [source, sqlModel],
        edges: [{ sourceId: source.id, targetId: sqlModel.id }],
        expandedNodeIds: new Set([source.id, sqlModel.id]),
      })
    ).toEqual([
      expect.objectContaining({
        source: source.id,
        target: sqlModel.id,
        data: expect.objectContaining({
          removable: false,
          sourceColumnName: 'order_id',
          targetColumnName: 'order_id',
        }),
      }),
    ]);
  });

  it('does not infer lineage for arbitrary SQL or malformed provenance', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'order_id', type: 'integer' },
    ]);
    const arbitrarySql = {
      ...buildNode('sql-model', 'dvt:sql_transform', 'transform'),
      metadata: {
        sql: 'select order_id from public.source_1',
        config: { sql: 'select order_id from public.source_1' },
        transformAuthoring: { version: 'v1', mode: 'sql' },
      },
    } satisfies CanonicalNode;
    const malformedProvenance = {
      ...arbitrarySql,
      id: 'malformed-model',
      metadata: {
        ...arbitrarySql.metadata,
        transformLineageProvenance: { version: 'v2', outputs: 'not-a-recipe' },
      },
    } satisfies CanonicalNode;

    for (const model of [arbitrarySql, malformedProvenance]) {
      expect(
        projectCanvasColumnLineage({
          nodes: [source, model],
          edges: [{ sourceId: source.id, targetId: model.id }],
          expandedNodeIds: new Set([source.id, model.id]),
        })
      ).toEqual([]);
    }
  });

  it('derives read-only identity lineage for a generated DBT model from its selected origin', () => {
    const source = {
      ...buildNode('warehouse-source', 'dvt:source', 'input', [
        { name: 'event_id', type: 'text' },
        { name: 'event_type', type: 'text' },
      ]),
      pluginId: 'dvt.warehouse-source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/dvt/auth_audit_events',
        },
        sourceName: 'local_postgres_proof_dvt_dvt',
        schema: 'dvt',
        tableName: 'auth_audit_events',
        columns: [
          { name: 'event_id', type: 'text' },
          { name: 'event_type', type: 'text' },
        ],
      },
    } satisfies CanonicalNode;
    const model = {
      ...buildNode('dbt-model', 'dbt:model', 'transform'),
      pluginId: 'dbt',
      metadata: { typeLabel: 'Model' },
    } satisfies CanonicalNode;

    const projected = projectCanvasColumnLineage({
      nodes: [source, model],
      edges: [{ sourceId: source.id, targetId: model.id }],
      expandedNodeIds: new Set([source.id, model.id]),
    });

    expect(projected).toHaveLength(2);
    expect(projected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceHandle: createCanvasColumnHandleId({
            direction: 'source',
            nodeId: source.id,
            columnId: 'event_id',
          }),
          targetHandle: createCanvasColumnHandleId({
            direction: 'target',
            nodeId: model.id,
            columnId: 'event_id',
          }),
          data: expect.objectContaining({
            sourceColumnName: 'event_id',
            targetColumnName: 'event_id',
            removable: false,
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            sourceColumnName: 'event_type',
            targetColumnName: 'event_type',
            removable: false,
          }),
        }),
      ])
    );
  });

  it('derives read-only identity lineage from a generated DBT model to its snapshot', () => {
    const source = {
      ...buildNode('warehouse-source', 'dvt:source', 'input', [
        { name: 'event_id', type: 'text' },
        { name: 'event_type', type: 'text' },
      ]),
      pluginId: 'dvt.warehouse-source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/dvt/auth_audit_events',
        },
        sourceName: 'local_postgres_proof_dvt_dvt',
        schema: 'dvt',
        tableName: 'auth_audit_events',
        columns: [
          { name: 'event_id', type: 'text' },
          { name: 'event_type', type: 'text' },
        ],
      },
    } satisfies CanonicalNode;
    const model = {
      ...buildNode('dbt-model', 'dbt:model', 'transform'),
      pluginId: 'dbt',
      metadata: { typeLabel: 'Model' },
    } satisfies CanonicalNode;
    const snapshot = {
      ...buildNode('dbt-snapshot', 'dbt:snapshot', 'transform'),
      pluginId: 'dbt',
      metadata: {},
    } satisfies CanonicalNode;
    const edges = [
      { sourceId: source.id, targetId: model.id },
      { sourceId: model.id, targetId: snapshot.id },
    ];

    const projected = projectCanvasColumnLineage({
      nodes: [source, model, snapshot],
      edges,
      expandedNodeIds: new Set([source.id, model.id, snapshot.id]),
    }).filter((edge) => edge.target === snapshot.id);

    expect(projected).toHaveLength(2);
    expect(projected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: model.id,
          target: snapshot.id,
          sourceHandle: createCanvasColumnHandleId({
            direction: 'source',
            nodeId: model.id,
            columnId: 'event_id',
          }),
          targetHandle: createCanvasColumnHandleId({
            direction: 'target',
            nodeId: snapshot.id,
            columnId: 'event_id',
          }),
          data: expect.objectContaining({
            sourceColumnName: 'event_id',
            targetColumnName: 'event_id',
            removable: false,
          }),
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            sourceColumnName: 'event_type',
            targetColumnName: 'event_type',
            removable: false,
          }),
        }),
      ])
    );

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model, snapshot],
        edges,
        expandedNodeIds: new Set([source.id, model.id]),
      }).filter((edge) => edge.target === snapshot.id)
    ).toEqual([]);

    const incompatibleSnapshot = {
      ...snapshot,
      metadata: { columns: [{ name: 'event_id', type: 'integer' }] },
    } satisfies CanonicalNode;
    expect(
      projectCanvasColumnLineage({
        nodes: [source, model, incompatibleSnapshot],
        edges,
        expandedNodeIds: new Set([source.id, model.id, snapshot.id]),
      }).filter((edge) => edge.target === snapshot.id)
    ).toEqual([]);

    const authoredModel = {
      ...model,
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'view',
          selectedSourceId: source.id,
        },
        config: { sql: 'select count(*) as event_count from dvt.auth_audit_events' },
      },
    } satisfies CanonicalNode;
    expect(
      projectCanvasColumnLineage({
        nodes: [source, authoredModel, snapshot],
        edges,
        expandedNodeIds: new Set([source.id, model.id, snapshot.id]),
      }).filter((edge) => edge.target === snapshot.id)
    ).toEqual([]);
  });

  it('does not invent DBT column lineage for authored model SQL', () => {
    const source = {
      ...buildNode('dbt-source', 'dbt:source', 'input', [{ name: 'order_id', type: 'integer' }]),
      pluginId: 'dbt',
      metadata: {
        dbt: { sourceName: 'raw', schemaName: 'public', tableName: 'orders' },
        columns: [{ name: 'order_id', type: 'integer' }],
      },
    } satisfies CanonicalNode;
    const model = {
      ...buildNode('dbt-model', 'dbt:model', 'transform'),
      pluginId: 'dbt',
      metadata: {
        dbt: {
          packageName: 'analytics',
          materialized: 'view',
          selectedSourceId: source.id,
        },
        config: { sql: 'select count(*) as order_count from public.orders' },
      },
    } satisfies CanonicalNode;

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id, model.id]),
      })
    ).toEqual([]);
  });

  it('derives terminal model-to-sink lineage only for a unique exact compatible column', () => {
    const model = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:event_id',
            name: 'event_id',
            dataType: 'integer',
            expression: {
              inputs: [{ nodeId: 'source', columnName: 'event_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );
    const sink = buildNode('sink', 'dvt:sink', 'output', [
      { name: 'event_id', type: 'integer' },
      { name: 'other', type: 'text' },
    ]);

    const projected = projectCanvasColumnLineage({
      nodes: [model, sink],
      edges: [{ sourceId: model.id, targetId: sink.id }],
      expandedNodeIds: new Set([model.id, sink.id]),
    });

    expect(projected).toEqual([
      expect.objectContaining({
        id: 'column-lineage:model:output%3Aevent_id:sink:event_id',
        source: model.id,
        target: sink.id,
        data: expect.objectContaining({ kind: 'column-lineage-terminal', removable: false }),
      }),
    ]);
  });
});
