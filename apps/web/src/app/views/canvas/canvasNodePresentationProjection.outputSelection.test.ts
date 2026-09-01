import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';

describe('Canvas canonical output selection presentation', () => {
  it('keeps excluded upstream fields visible so they can be selected again', () => {
    const connectedSourceRef: ConnectedSourceRef = {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    };
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
        connectedSourceRef,
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'customer', type: 'text' },
        ],
      },
    };
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
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: source.id,
            schema: 'raw',
            table: 'orders',
            sourceRef: connectedSourceRef,
            fields: [
              { name: 'order_id', dataType: 'integer' },
              { name: 'customer', dataType: 'text' },
            ],
          },
          targetNodeId: 'transform-orders',
          outputs: [],
        })
      )
    );

    const columns = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [source, transform],
      edges: [{ sourceId: source.id, targetId: transform.id }],
    }).columns;

    expect(columns.visible.map(({ name, provenance }) => ({ name, provenance }))).toEqual([
      { name: 'order_id', provenance: 'inherited' },
      { name: 'customer', provenance: 'inherited' },
    ]);
    expect(columns).toMatchObject({
      declaredCount: 0,
      inheritedCount: 2,
      visibleCount: 2,
      visibleProvenance: 'inherited',
    });
  });
});
