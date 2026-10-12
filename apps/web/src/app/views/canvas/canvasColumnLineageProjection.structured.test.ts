import { projectCanvasColumnLineageForGraph as projectCanvasColumnLineage } from './canvasColumnLineageProjection.test-fixtures';
import { describe, expect, it } from 'vitest';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { canvasInputSlotId } from './canvasInputBindings';
import { parseCanvasColumnHandleId } from './canvasColumnHandleIdentity';

import type { CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const sourceRef: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  sourceObjectId: 'raw.orders',
};

describe('structured Canvas column lineage', () => {
  it('keeps external wiring at Input and publishes structured parents as single producer fields', async () => {
    const source: CanonicalNode = {
      id: 'source-orders',
      name: 'orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: sourceRef,
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'customer', type: 'text' },
          { name: 'amount', type: 'numeric' },
        ],
      },
    };
    const draft = composeDvtSubstraitProjectionFields(
      createDvtSubstraitProjectionDraft({
        source: {
          nodeId: source.id,
          schema: 'raw',
          table: 'orders',
          sourceRef,
          fields: [
            { name: 'order_id', dataType: 'integer' },
            { name: 'customer', dataType: 'text' },
            { name: 'amount', dataType: 'numeric' },
          ],
        },
        targetNodeId: 'transform-orders',
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
          { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
        ],
      }),
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      }
    );
    const transform = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-orders',
        name: 'Transform orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: {},
      },
      encodeDvtSubstraitStructuredFieldDocument(draft)
    );

    const edges = await projectCanvasColumnLineage({
      nodes: [source, transform],
      edges: [{ sourceId: source.id, targetId: transform.id }],
      expandedNodeIds: new Set([source.id, transform.id]),
    });

    expect(edges).toHaveLength(3);
    expect(edges.map((edge) => edge.data?.targetColumnName)).toEqual([
      'order_id',
      'customer',
      'amount',
    ]);
    for (const edge of edges) {
      expect(parseCanvasColumnHandleId(edge.targetHandle)?.columnId).toBe(
        canvasInputSlotId(source.id, edge.data!.sourceFieldId)
      );
      expect(edge.data?.removable).toBe(false);
    }

    const consumer: CanonicalNode = {
      id: 'consumer',
      name: 'Consumer',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const downstream = await projectCanvasColumnLineage({
      nodes: [source, transform, consumer],
      edges: [
        { sourceId: source.id, targetId: transform.id },
        { sourceId: transform.id, targetId: consumer.id },
      ],
      expandedNodeIds: new Set([transform.id, consumer.id]),
    });
    expect(downstream).toHaveLength(4);
    expect(downstream.every((edge) => edge.source === transform.id)).toBe(true);
    const parent = downstream.find((edge) => edge.data?.sourceFieldId === 'output:identity');
    expect(parent?.data).toMatchObject({
      sourceFieldId: 'output:identity',
      targetColumnName: 'identity',
      outputId: canvasInputSlotId(transform.id, 'output:identity'),
    });
    expect(parseCanvasColumnHandleId(parent?.sourceHandle)?.columnId).toBe('output:identity');
    expect(downstream.some((edge) => edge.data?.targetColumnName.includes('.'))).toBe(false);
  });
});
