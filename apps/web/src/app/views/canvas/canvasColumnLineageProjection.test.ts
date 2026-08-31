import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitSemanticDocument,
  applyDvtVisualTransformRecipe,
  convertDvtVisualTransformToSql,
} from './canvasDvtTransformAuthoringAuthority';
import {
  appendDvtSubstraitInnerJoinInput,
  applyDvtSubstraitInnerJoinFieldEdit,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  applyDvtSubstraitUnionAllFieldEdit,
  createDvtSubstraitUnionAllDraft,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';
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

  it('does not project lineage from an unrelated node with matching column names', () => {
    const orders = buildNode('orders', 'dvt:source', 'input', [
      { name: 'order_id', type: 'integer' },
    ]);
    const workspaceDrafts = buildNode('workspace_graph_drafts', 'dvt:source', 'input', [
      { name: 'order_id', type: 'integer' },
    ]);
    const model = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      {
        version: 'v1',
        outputs: [
          {
            id: 'output:order_id',
            name: 'order_id',
            dataType: 'integer',
            expression: {
              inputs: [{ nodeId: workspaceDrafts.id, columnName: 'order_id' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
        filters: [],
      }
    );

    expect(
      projectCanvasColumnLineage({
        nodes: [orders, workspaceDrafts, model],
        edges: [{ sourceId: orders.id, targetId: model.id }],
        expandedNodeIds: new Set([orders.id, workspaceDrafts.id, model.id]),
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

  it('derives selected INNER JOIN field lineage from Substrait and stable sidecar identity', () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const customers = {
      ...buildNode('source-customers', 'dvt:source', 'input', [
        { name: 'customer_id', type: 'string' },
        { name: 'name', type: 'string' },
      ]),
      name: 'customers',
      metadata: {
        tableName: 'customers',
        schema: 'public',
        columns: [
          { name: 'customer_id', type: 'string' },
          { name: 'name', type: 'string' },
        ],
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef,
          sourceObjectId: 'public.customers',
        },
      },
    } satisfies CanonicalNode;
    const orders = {
      ...buildNode('source-orders', 'dvt:source', 'input', [
        { name: 'order_id', type: 'string' },
        { name: 'customer_id', type: 'string' },
      ]),
      name: 'orders',
      metadata: {
        tableName: 'orders',
        schema: 'public',
        columns: [
          { name: 'order_id', type: 'string' },
          { name: 'customer_id', type: 'string' },
        ],
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1' as const,
          connectionRef,
          sourceObjectId: 'public.orders',
        },
      },
    } satisfies CanonicalNode;
    let draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: customers.metadata.connectedSourceRef,
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: orders.metadata.connectedSourceRef,
      },
      targetNodeId: 'model',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });
    const model = applyDvtSubstraitSemanticDocument(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );

    const projected = projectCanvasColumnLineage({
      nodes: [customers, orders, model],
      edges: [
        { sourceId: customers.id, targetId: model.id },
        { sourceId: orders.id, targetId: model.id },
      ],
      expandedNodeIds: new Set([customers.id, orders.id, model.id]),
    });

    expect(projected).toEqual([
      expect.objectContaining({
        source: customers.id,
        target: model.id,
        targetHandle: createCanvasColumnHandleId({
          direction: 'target',
          nodeId: model.id,
          columnId: 'field:model:name',
        }),
        data: expect.objectContaining({
          sourceColumnName: 'name',
          targetColumnName: 'customer_name',
          outputId: 'field:model:name',
          removable: false,
        }),
      }),
      expect.objectContaining({
        source: orders.id,
        target: model.id,
        targetHandle: createCanvasColumnHandleId({
          direction: 'target',
          nodeId: model.id,
          columnId: 'field:model:order_id',
        }),
        data: expect.objectContaining({
          sourceColumnName: 'order_id',
          targetColumnName: 'order_id',
          outputId: 'field:model:order_id',
          removable: false,
        }),
      }),
    ]);

    draft = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: 'field:model:name',
      countOutputName: 'order_count',
    });
    draft = applyDvtSubstraitInnerJoinGroupedRowNumber(draft, { outputName: 'count_rank' });
    const groupedModel = applyDvtSubstraitSemanticDocument(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const groupedProjection = projectCanvasColumnLineage({
      nodes: [customers, orders, groupedModel],
      edges: [
        { sourceId: customers.id, targetId: groupedModel.id },
        { sourceId: orders.id, targetId: groupedModel.id },
      ],
      expandedNodeIds: new Set([customers.id, orders.id, groupedModel.id]),
    });
    expect(groupedProjection).toEqual([
      expect.objectContaining({
        source: customers.id,
        target: groupedModel.id,
        data: expect.objectContaining({
          sourceColumnName: 'name',
          targetColumnName: 'customer_name',
          outputId: 'field:model:name',
        }),
      }),
    ]);
  });

  it.each([3, 4])(
    'derives every selected N=%i INNER JOIN output from its stable source identity',
    (inputCount) => {
      const connectionRef = {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-main',
        provider: 'postgres' as const,
      };
      const source = (id: string, table: string, columns: readonly string[]): CanonicalNode => ({
        ...buildNode(
          id,
          'dvt:source',
          'input',
          columns.map((name) => ({ name, type: 'string' }))
        ),
        name: table,
        metadata: {
          tableName: table,
          schema: 'public',
          columns: columns.map((name) => ({ name, type: 'string' })),
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1' as const,
            connectionRef,
            sourceObjectId: `public.${table}`,
          },
        },
      });
      const customers = source('source-customers', 'customers', ['customer_id', 'name']);
      const orders = source('source-orders', 'orders', ['order_id', 'customer_id']);
      const shipments = source('source-shipments', 'shipments', ['shipment_id', 'customer_id']);
      const tickets = source('source-tickets', 'tickets', ['ticket_id', 'customer_id']);
      const sources = [customers, orders, shipments, ...(inputCount === 4 ? [tickets] : [])];

      let draft = createDvtSubstraitInnerJoinDraft({
        left: {
          nodeId: customers.id,
          schema: 'public',
          table: 'customers',
          sourceRef: customers.metadata!.connectedSourceRef as ConnectedSourceRef,
        },
        right: {
          nodeId: orders.id,
          schema: 'public',
          table: 'orders',
          sourceRef: orders.metadata!.connectedSourceRef as ConnectedSourceRef,
        },
        targetNodeId: 'model',
      });
      for (const [node, field] of [
        [shipments, 'shipment_id'],
        ...(inputCount === 4 ? ([[tickets, 'ticket_id']] as const) : []),
      ] as const) {
        draft = appendDvtSubstraitInnerJoinInput(draft, {
          source: {
            nodeId: node.id,
            schema: 'public',
            table: node.metadata!.tableName as string,
            sourceRef: node.metadata!.connectedSourceRef as ConnectedSourceRef,
          },
          fields: (node.metadata!.columns as readonly { name: string }[]).map(
            (column) => column.name
          ),
          predicate: {
            leftSourceFieldId: 'field:source-customers:customer_id',
            rightFieldName: 'customer_id',
          },
          selectedFields: [field],
        });
      }
      const model = applyDvtSubstraitSemanticDocument(
        buildNode('model', 'dvt:sql_transform', 'transform'),
        encodeDvtSubstraitInnerJoinDocument(draft)
      );

      const projected = projectCanvasColumnLineage({
        nodes: [...sources, model],
        edges: sources.map((node) => ({ sourceId: node.id, targetId: model.id })),
        expandedNodeIds: new Set([...sources.map((node) => node.id), model.id]),
      });

      expect(projected.map((edge) => [edge.source, edge.data?.sourceColumnName])).toEqual([
        [customers.id, 'customer_id'],
        [customers.id, 'name'],
        [orders.id, 'order_id'],
        [shipments.id, 'shipment_id'],
        ...(inputCount === 4 ? [[tickets.id, 'ticket_id']] : []),
      ]);
      expect(projected.map((edge) => edge.data?.outputId)).toEqual([
        'field:model:customer_id',
        'field:model:name',
        'field:model:order_id',
        'field:model:shipment_id',
        ...(inputCount === 4 ? ['field:model:ticket_id'] : []),
      ]);
      expect(projected.map((edge) => edge.data?.sourceFieldId)).toEqual([
        'field:source-customers:customer_id',
        'field:source-customers:name',
        'field:source-orders:order_id',
        'field:source-shipments:shipment_id',
        ...(inputCount === 4 ? ['field:source-tickets:ticket_id'] : []),
      ]);

      const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
        groupFieldId: 'field:model:shipment_id',
        countOutputName: 'shipment_count',
      });
      const ranked = applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, {
        outputName: 'shipment_rank',
      });
      const rankedModel = applyDvtSubstraitSemanticDocument(
        buildNode('model', 'dvt:sql_transform', 'transform'),
        encodeDvtSubstraitInnerJoinDocument(ranked)
      );
      const groupedProjection = projectCanvasColumnLineage({
        nodes: [...sources, rankedModel],
        edges: sources.map((node) => ({ sourceId: node.id, targetId: rankedModel.id })),
        expandedNodeIds: new Set([...sources.map((node) => node.id), rankedModel.id]),
      });
      expect(
        groupedProjection.map((edge) => [
          edge.source,
          edge.data?.sourceFieldId,
          edge.data?.targetColumnName,
        ])
      ).toEqual([['source-shipments', 'field:source-shipments:shipment_id', 'shipment_id']]);
    }
  );

  it('fails N-input lineage closed when one connected source identity is stale', () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const connectedSourceRef = (table: string): ConnectedSourceRef => ({
      schemaVersion: 'connected-source-ref.v1',
      connectionRef,
      sourceObjectId: `public.${table}`,
    });
    const source = (id: string, table: string, columns: readonly string[]): CanonicalNode => ({
      ...buildNode(
        id,
        'dvt:source',
        'input',
        columns.map((name) => ({ name, type: 'string' }))
      ),
      metadata: {
        schema: 'public',
        tableName: table,
        columns: columns.map((name) => ({ name, type: 'string' })),
        connectedSourceRef: connectedSourceRef(table),
      },
    });
    const customers = source('source-customers', 'customers', ['customer_id', 'name']);
    const orders = source('source-orders', 'orders', ['order_id', 'customer_id']);
    const shipments = source('source-shipments', 'shipments', ['shipment_id', 'customer_id']);
    let draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: customers.id,
        schema: 'public',
        table: 'customers',
        sourceRef: connectedSourceRef('customers'),
      },
      right: {
        nodeId: orders.id,
        schema: 'public',
        table: 'orders',
        sourceRef: connectedSourceRef('orders'),
      },
      targetNodeId: 'model',
    });
    draft = appendDvtSubstraitInnerJoinInput(draft, {
      source: {
        nodeId: shipments.id,
        schema: 'public',
        table: 'shipments',
        sourceRef: connectedSourceRef('shipments'),
      },
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    const model = applyDvtSubstraitSemanticDocument(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const copiedModel = applyDvtSubstraitSemanticDocument(
      buildNode('copied-model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const staleShipments = {
      ...shipments,
      metadata: {
        ...shipments.metadata,
        connectedSourceRef: connectedSourceRef('other_shipments'),
      },
    };

    expect(
      projectCanvasColumnLineage({
        nodes: [customers, orders, shipments, copiedModel],
        edges: [customers, orders, shipments].map((node) => ({
          sourceId: node.id,
          targetId: copiedModel.id,
        })),
        expandedNodeIds: new Set([customers.id, orders.id, shipments.id, copiedModel.id]),
      })
    ).toEqual([]);

    expect(
      projectCanvasColumnLineage({
        nodes: [customers, orders, staleShipments, model],
        edges: [customers, orders, staleShipments].map((node) => ({
          sourceId: node.id,
          targetId: model.id,
        })),
        expandedNodeIds: new Set([customers.id, orders.id, staleShipments.id, model.id]),
      })
    ).toEqual([]);
  });

  it('derives each UNION ALL output from both contributing source fields', () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const fields = ['customer_id', 'name', 'country'];
    const connectedSourceRef = (table: string): ConnectedSourceRef => ({
      schemaVersion: 'connected-source-ref.v1',
      connectionRef,
      sourceObjectId: `public.${table}`,
    });
    const source = (id: string, table: string): CanonicalNode => ({
      ...buildNode(
        id,
        'dvt:source',
        'input',
        fields.map((name) => ({ name, type: 'string' }))
      ),
      name: table,
      metadata: {
        tableName: table,
        schema: 'public',
        columns: fields.map((name) => ({ name, type: 'string' })),
        connectedSourceRef: connectedSourceRef(table),
      },
    });
    const north = source('source-north', 'customers_north');
    const south = source('source-south', 'customers_south');
    let draft = createDvtSubstraitUnionAllDraft({
      inputs: [
        {
          nodeId: north.id,
          schema: 'public',
          table: 'customers_north',
          fields: fields.map((name) => ({ name, type: 'string' as const })),
          sourceRef: connectedSourceRef('customers_north'),
        },
        {
          nodeId: south.id,
          schema: 'public',
          table: 'customers_south',
          fields: fields.map((name) => ({ name, type: 'string' as const })),
          sourceRef: connectedSourceRef('customers_south'),
        },
      ],
      targetNodeId: 'model',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    const model = applyDvtSubstraitSemanticDocument(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitUnionAllDocument(draft)
    );

    const projected = projectCanvasColumnLineage({
      nodes: [north, south, model],
      edges: [
        { sourceId: north.id, targetId: model.id },
        { sourceId: south.id, targetId: model.id },
      ],
      expandedNodeIds: new Set([north.id, south.id, model.id]),
    });

    expect(projected).toHaveLength(6);
    expect(projected.filter((edge) => edge.source === north.id)).toHaveLength(3);
    expect(projected.filter((edge) => edge.source === south.id)).toHaveLength(3);
    expect(projected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: north.id,
          targetHandle: createCanvasColumnHandleId({
            direction: 'target',
            nodeId: model.id,
            columnId: 'field:model:country',
          }),
          data: expect.objectContaining({
            sourceColumnName: 'country',
            targetColumnName: 'region',
          }),
        }),
        expect.objectContaining({
          source: south.id,
          targetHandle: createCanvasColumnHandleId({
            direction: 'target',
            nodeId: model.id,
            columnId: 'field:model:country',
          }),
          data: expect.objectContaining({
            sourceColumnName: 'country',
            targetColumnName: 'region',
          }),
        }),
      ])
    );

    draft = applyDvtSubstraitUnionAllGrouping(draft, {
      groupFieldId: 'field:model:country',
      countOutputName: 'customer_count',
    });
    draft = applyDvtSubstraitUnionAllGroupedRowNumber(draft, {
      outputName: 'count_rank',
    });
    const groupedModel = applyDvtSubstraitSemanticDocument(
      buildNode('model', 'dvt:sql_transform', 'transform'),
      encodeDvtSubstraitUnionAllDocument(draft)
    );
    const groupedProjection = projectCanvasColumnLineage({
      nodes: [north, south, groupedModel],
      edges: [
        { sourceId: north.id, targetId: groupedModel.id },
        { sourceId: south.id, targetId: groupedModel.id },
      ],
      expandedNodeIds: new Set([north.id, south.id, groupedModel.id]),
    });
    expect(groupedProjection).toHaveLength(2);
    expect(groupedProjection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: north.id,
          data: expect.objectContaining({
            sourceColumnName: 'country',
            targetColumnName: 'region',
          }),
        }),
        expect.objectContaining({
          source: south.id,
          data: expect.objectContaining({
            sourceColumnName: 'country',
            targetColumnName: 'region',
          }),
        }),
      ])
    );
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
