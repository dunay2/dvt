import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
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

function buildProjectionGraph(outputName = 'order_id'): readonly [CanonicalNode, CanonicalNode] {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: 'raw.orders',
  };
  const source: CanonicalNode = {
    ...buildNode('source-orders', 'dvt:source', 'input', [{ name: 'order_id', type: 'integer' }]),
    metadata: {
      schema: 'raw',
      tableName: 'orders',
      connectedSourceRef: sourceRef,
      columns: [{ name: 'order_id', type: 'integer' }],
    },
  };
  const model = applyDvtSubstraitSemanticDocument(
    buildNode('model-orders', 'dvt:transform', 'transform'),
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source: {
          nodeId: source.id,
          schema: 'raw',
          table: 'orders',
          sourceRef,
          fields: [{ name: 'order_id', dataType: 'integer' }],
        },
        targetNodeId: 'model-orders',
        outputs: [
          { fieldId: 'output:stable-order-id', name: outputName, sourceFieldName: 'order_id' },
        ],
      })
    )
  );
  return [source, model];
}

describe('Canvas column lineage projection', () => {
  it('roundtrips UI handles and exposes ports according to node role', () => {
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
    expect(resolveCanvasColumnPortDirections('input')).toEqual(['source']);
    expect(resolveCanvasColumnPortDirections('transform')).toEqual(['target', 'source']);
    expect(resolveCanvasColumnPortDirections('output')).toEqual(['target']);
  });

  it('derives removable lineage only from connected reference-backed canonical fields', () => {
    const [source, model] = buildProjectionGraph();
    const project = (
      expandedNodeIds: ReadonlySet<string>,
      connected = true
    ): ReturnType<typeof projectCanvasColumnLineage> =>
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: connected ? [{ sourceId: source.id, targetId: model.id }] : [],
        expandedNodeIds,
      });

    expect(project(new Set([source.id, model.id]))).toEqual([
      expect.objectContaining({
        source: source.id,
        target: model.id,
        data: expect.objectContaining({
          sourceFieldId: 'field:source-orders:order_id',
          outputId: 'output:stable-order-id',
          removable: true,
        }),
      }),
    ]);
    expect(project(new Set([source.id]))).toEqual([]);
    expect(project(new Set([source.id, model.id]), false)).toEqual([]);
  });

  it('keeps lineage identity stable when only the target display name changes', () => {
    const [source, original] = buildProjectionGraph('order_id');
    const [, renamed] = buildProjectionGraph('customer_order_id');
    const expanded = new Set([source.id, original.id]);
    const edges = [{ sourceId: source.id, targetId: original.id }];

    const originalLineage = projectCanvasColumnLineage({
      nodes: [source, original],
      edges,
      expandedNodeIds: expanded,
    });
    const renamedLineage = projectCanvasColumnLineage({
      nodes: [source, renamed],
      edges,
      expandedNodeIds: expanded,
    });

    expect(originalLineage).toHaveLength(1);
    expect(renamedLineage).toHaveLength(1);
    expect(renamedLineage[0]?.id).toBe(originalLineage[0]?.id);
    expect(renamedLineage[0]?.data?.sourceFieldId).toBe(originalLineage[0]?.data?.sourceFieldId);
    expect(renamedLineage[0]?.data?.outputId).toBe(originalLineage[0]?.data?.outputId);
    expect(renamedLineage[0]?.data?.targetColumnName).toBe('customer_order_id');
  });

  it('does not fabricate lineage for dbt columns that only share a name', () => {
    const source: CanonicalNode = {
      id: 'dbt-source',
      name: 'source_orders',
      pluginId: 'dbt',
      kind: 'dbt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'id', type: 'integer' }] },
    };
    const model: CanonicalNode = {
      id: 'dbt-model',
      name: 'fct_orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'id', type: 'integer' }] },
    };

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id, model.id]),
      })
    ).toEqual([]);
  });
});
