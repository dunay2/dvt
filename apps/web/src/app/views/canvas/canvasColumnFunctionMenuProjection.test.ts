import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { projectCanvasColumnFunctionMenus } from './canvasColumnFunctionMenuProjection';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

function node(
  kind: CanonicalNode['kind'],
  pluginId: string,
  role: CanonicalNode['role']
): CanonicalNode {
  return { id: kind, name: kind, kind, pluginId, role, status: 'idle', tags: [] };
}

const source: CanonicalNode = {
  id: 'source-events',
  name: 'Events',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'events',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.events',
    },
    columns: [{ name: 'event_type', type: 'text' }],
  },
};

function projectionTransform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'events',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [{ name: 'event_type', dataType: 'text' }],
    },
    targetNodeId: 'transform-events',
    outputs: [{ fieldId: 'output:event_type', name: 'event_type', sourceFieldName: 'event_type' }],
  });
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-events',
      name: 'Transform events',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

describe('Canvas column function menu projection', () => {
  it('offers CONCAT and COALESCE as completable text proposals from one column', () => {
    const transform = projectionTransform();
    const projection = projectCanvasColumnFunctionMenus({
      node: transform,
      nodes: [source, transform],
      edges: [{ sourceId: source.id, targetId: transform.id }],
    });
    const items = projection.menus?.get('output:event_type')?.menu.items ?? [];

    expect(items.map((item) => item.name)).toEqual(expect.arrayContaining(['concat', 'coalesce']));
    expect(items.find((item) => item.name === 'concat')).toMatchObject({
      minimumArgumentCount: 2,
      maximumArgumentCount: 2,
    });
    expect(items.find((item) => item.name === 'coalesce')).toMatchObject({
      minimumArgumentCount: 2,
    });
  });

  it.each([
    node('dvt:source', 'dvt.warehouse-source', 'input'),
    node('dvt:source', 'dbt', 'input'),
    node('dvt:transform', 'dbt', 'transform'),
  ])('withholds Transform functions from $kind authority', (candidate) => {
    expect(
      projectCanvasColumnFunctionMenus({ node: candidate, nodes: [candidate], edges: [] })
    ).toEqual({
      hasEditableProjection: false,
      supportsCalculatedColumns: false,
    });
  });
});
