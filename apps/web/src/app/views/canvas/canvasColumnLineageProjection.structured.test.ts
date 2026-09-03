import { describe, expect, it } from 'vitest';
import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';
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
  it('connects each persisted leaf to its structured parent handle', () => {
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

    const edges = projectCanvasColumnLineage({
      nodes: [source, transform],
      edges: [{ sourceId: source.id, targetId: transform.id }],
      expandedNodeIds: new Set([source.id, transform.id]),
    });

    expect(
      edges.map((edge) => ({
        source: edge.data?.sourceColumnName,
        target: edge.data?.targetColumnName,
        targetHandle: edge.targetHandle,
      }))
    ).toEqual([
      expect.objectContaining({ source: 'order_id', target: 'identity.order_id' }),
      expect.objectContaining({ source: 'customer', target: 'identity.customer' }),
      expect.objectContaining({ source: 'amount', target: 'amount' }),
    ]);
    expect(edges[0]?.targetHandle).toBe(edges[1]?.targetHandle);
    expect(edges[2]?.targetHandle).not.toBe(edges[0]?.targetHandle);
  });
});
