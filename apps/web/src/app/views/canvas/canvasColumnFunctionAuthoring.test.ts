import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';

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
    columns: [
      { name: 'event_id', type: 'text' },
      { name: 'event_type', type: 'text' },
    ],
  },
};

const model: CanonicalNode = {
  id: 'model-events',
  name: 'Model 2',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['finance'],
  metadata: {
    rowCount: 7800,
    sizeBytes: 2_600_000,
    config: { materialized: 'view' },
    dbt: {
      selectedSourceId: source.id,
      projectionColumns: [
        { name: 'event_type', output: true },
        { name: 'event_id', output: true },
      ],
    },
  },
};

function draftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: [source.id, model.id],
      visibleEdges: [{ sourceId: source.id, targetId: model.id }],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: { [source.id]: source, [model.id]: model },
  };
}

describe('Canvas column function authoring', () => {
  it('rejects a function on an external DBT model without changing its identity or authority', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');

    const initial = draftSession();
    const result = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      identity: {
        nodeId: model.id,
        columnId: 'event_type',
        capabilityId: trim.capabilityId,
        alias: 'event_type_clean',
      },
    });

    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[model.id]).toBe(model);
  });
});
