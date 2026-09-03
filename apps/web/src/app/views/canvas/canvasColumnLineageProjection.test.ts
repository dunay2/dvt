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

function buildProjectionGraph(): readonly [CanonicalNode, CanonicalNode] {
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
        outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
      })
    )
  );
  return [source, model];
}

describe('Canvas column lineage projection', () => {
  it('roundtrips stable handles and exposes ports according to node role', () => {
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

  it('derives removable lineage only from connected, disclosed canonical fields', () => {
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
          outputId: 'output:order_id',
          removable: true,
        }),
      }),
    ]);
    expect(project(new Set([source.id]))).toEqual([]);
    expect(project(new Set([source.id, model.id]), false)).toEqual([]);
  });
});
