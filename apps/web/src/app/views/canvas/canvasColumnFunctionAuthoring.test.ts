import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

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
  pluginId: 'dbt',
  kind: 'dbt:model',
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
  it('replaces a generated DBT model with one canonical Substrait Transform', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');

    const result = applyCanvasColumnFunction({
      draftSession: draftSession(),
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

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[model.id];
    expect(replacement).toMatchObject({
      id: model.id,
      pluginId: 'dvt',
      kind: 'dvt:transform',
      metadata: { rowCount: 7800, sizeBytes: 2_600_000 },
    });
    expect(replacement?.metadata).not.toHaveProperty('dbt');
    expect(replacement?.metadata).not.toHaveProperty('config');
    if (replacement == null) throw new Error('Expected replacement Transform.');
    const authority = readDvtTransformAuthoringAuthority(replacement)!;
    if (authority.mode !== 'substrait') throw new Error('Expected Substrait authority.');
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok ? inspection.projection.outputs : []).toMatchObject([
      { name: 'event_type_clean', sourceFieldName: 'event_type', operations: ['trim'] },
      { name: 'event_id', sourceFieldName: 'event_id' },
    ]);
  });

  it('replaces legacy SQL metadata with canonical Substrait semantics', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');

    const result = applyCanvasColumnFunction({
      draftSession: {
        ...draftSession(),
        localNodeCatalog: {
          [source.id]: source,
          [model.id]: {
            ...model,
            metadata: { ...model.metadata, sql: 'select * from raw.events' },
          },
        },
      },
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

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[model.id];
    expect(replacement).toMatchObject({ pluginId: 'dvt', kind: 'dvt:transform' });
    expect(replacement?.metadata).not.toHaveProperty('sql');
    expect(replacement?.metadata).not.toHaveProperty('config');
  });
});
