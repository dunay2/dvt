import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  applyCanvasColumnMapping,
  automapCanvasColumns,
  removeCanvasColumnMapping,
  resolveCanvasColumnMappingTarget,
} from './canvasColumnMappingAuthoring';
import {
  applyDvtVisualTransformRecipe,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

function buildNode(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role'],
  columns: readonly Readonly<{ name: string; type: string }>[] = [],
  metadata: Record<string, unknown> = {}
): CanonicalNode {
  const sourceIdentity =
    kind === 'dvt:source'
      ? {
          schema: 'public',
          tableName: id,
          connectedSourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-main',
              provider: 'postgres',
            },
            sourceObjectId: `public.${id}`,
          },
        }
      : {};
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
    metadata: { ...sourceIdentity, ...metadata, columns },
  };
}

function buildSession(
  nodes: readonly CanonicalNode[],
  edges: CanvasDraftSession['workingSet']['visibleEdges']
): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: [...edges],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function readMappedTransform(result: ReturnType<typeof applyCanvasColumnMapping>): CanonicalNode {
  expect(result.outcome).toBe('applied');
  if (result.outcome !== 'applied') throw new Error('Expected applied mapping.');
  const node = result.draftSession.localNodeCatalog?.model;
  if (node == null) throw new Error('Expected mapped transform node.');
  return node;
}

describe('Canvas column mapping authoring', () => {
  it('persists an orders passthrough as canonical Substrait authority', () => {
    const source = buildNode(
      'source-orders',
      'dvt:source',
      'input',
      [
        { name: 'order_id', type: 'integer' },
        { name: 'customer', type: 'text' },
        { name: 'amount', type: 'numeric' },
      ],
      {
        schema: 'raw',
        tableName: 'orders',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.orders',
        },
      }
    );
    const model = buildNode('model-orders', 'dvt:transform', 'transform');
    const session = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);

    const result = automapCanvasColumns({
      draftSession: session,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      targetNodeId: model.id,
      targetColumns: [
        { name: 'order_id', type: 'integer' },
        { name: 'customer', type: 'text' },
        { name: 'amount', type: 'numeric' },
      ],
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const mapped = result.draftSession.localNodeCatalog?.['model-orders'];
    if (mapped == null) throw new Error('Expected mapped Transform node.');
    const authority = readDvtTransformAuthoringAuthority(mapped);

    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    expect(mapped.metadata).not.toHaveProperty('sql');
  });

  it('creates one canonical passthrough projection through the existing graph draft aggregate', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const session = buildSession([source, model], [{ sourceId: 'source', targetId: 'model' }]);

    const result = applyCanvasColumnMapping({
      draftSession: session,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      source: { nodeId: 'source', columnName: 'event_id' },
      target: { nodeId: 'model', columnName: 'event_id', dataType: 'integer' },
    });
    const mapped = readMappedTransform(result);
    const authority = readDvtTransformAuthoringAuthority(mapped);

    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs).toEqual([
      expect.objectContaining({
        fieldId: 'output:event_id',
        name: 'event_id',
        sourceFieldName: 'event_id',
      }),
    ]);
    expect(session.localNodeCatalog?.model?.metadata).not.toHaveProperty('transformAuthoring');
  });

  it('changes an existing mapping while preserving the stable output id', () => {
    const first = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
    ]);
    const second = buildNode('source-2', 'dvt:source', 'input', [
      { name: 'renamed_id', type: 'integer' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const initial = buildSession(
      [first, second, model],
      [
        { sourceId: first.id, targetId: model.id },
        { sourceId: second.id, targetId: model.id },
      ]
    );
    const firstResult = applyCanvasColumnMapping({
      draftSession: initial,
      canonicalNodesById: new Map([
        [first.id, first],
        [second.id, second],
        [model.id, model],
      ]),
      source: { nodeId: first.id, columnName: 'event_id' },
      target: { nodeId: model.id, columnName: 'event_id', dataType: 'integer' },
    });
    const mapped = readMappedTransform(firstResult);
    const secondResult = applyCanvasColumnMapping({
      draftSession: firstResult.outcome === 'applied' ? firstResult.draftSession : initial,
      canonicalNodesById: new Map([
        [first.id, first],
        [second.id, second],
        [model.id, mapped],
      ]),
      source: { nodeId: second.id, columnName: 'renamed_id' },
      target: {
        nodeId: model.id,
        outputId: 'output:event_id',
        columnName: 'event_id',
        dataType: 'integer',
      },
    });
    const changed = readMappedTransform(secondResult);
    const authority = readDvtTransformAuthoringAuthority(changed);

    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]).toMatchObject({
      fieldId: 'output:event_id',
      sourceFieldName: 'renamed_id',
    });
    expect(inspection.projection.source.nodeId).toBe('source-2');
  });

  it('keeps the source type when a prospective target has no declared type yet', () => {
    const source = buildNode('source', 'dvt:source', 'input', [{ name: 'customer', type: 'text' }]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const session = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);

    const mapped = readMappedTransform(
      applyCanvasColumnMapping({
        draftSession: session,
        canonicalNodesById: new Map([
          [source.id, source],
          [model.id, model],
        ]),
        source: { nodeId: source.id, columnName: 'customer' },
        target: { nodeId: model.id, columnName: 'customer' },
      })
    );
    const authority = readDvtTransformAuthoringAuthority(mapped);

    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]?.sourceFieldName).toBe('customer');
  });

  it('fails closed rather than discarding nonblank SQL authority', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform', [], {
      sql: 'select event_id from source',
    });
    const session = buildSession([source, model], [{ sourceId: 'source', targetId: 'model' }]);

    const result = applyCanvasColumnMapping({
      draftSession: session,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      source: { nodeId: 'source', columnName: 'event_id' },
      target: { nodeId: 'model', columnName: 'event_id', dataType: 'integer' },
    });

    expect(result).toEqual({ outcome: 'rejected', reason: 'sql_authority_not_empty' });
  });

  it('automaps only unique exact-name columns with known compatible types', () => {
    const first = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
      { name: 'ambiguous', type: 'text' },
      { name: 'wrong_type', type: 'text' },
    ]);
    const second = buildNode('source-2', 'dvt:source', 'input', [
      { name: 'ambiguous', type: 'text' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const session = buildSession(
      [first, second, model],
      [
        { sourceId: first.id, targetId: model.id },
        { sourceId: second.id, targetId: model.id },
      ]
    );

    const result = automapCanvasColumns({
      draftSession: session,
      canonicalNodesById: new Map([
        [first.id, first],
        [second.id, second],
        [model.id, model],
      ]),
      targetNodeId: model.id,
      targetColumns: [
        { name: 'event_id', type: 'integer' },
        { name: 'ambiguous', type: 'text' },
        { name: 'wrong_type', type: 'integer' },
        { name: 'unknown_type', type: 'unknown' },
      ],
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const mapped = result.draftSession.localNodeCatalog?.model;
    if (mapped == null) throw new Error('Expected mapped transform node.');
    const authority = readDvtTransformAuthoringAuthority(mapped);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs.map((output) => output.name)).toEqual(['event_id']);
    expect(result.appliedCount).toBe(1);
    expect(result.skippedCount).toBe(3);
  });

  it('replaces an already mapped visual recipe with canonical Substrait authority', () => {
    const source = buildNode('source', 'dvt:source', 'input', [{ name: 'customer', type: 'text' }]);
    const visualModel = applyDvtVisualTransformRecipe(
      buildNode('model', 'dvt:transform', 'transform'),
      {
        version: 'v1',
        filters: [],
        outputs: [
          {
            id: 'output:customer',
            name: 'customer',
            dataType: 'text',
            expression: {
              inputs: [{ nodeId: source.id, columnName: 'customer' }],
              operations: [{ kind: 'passthrough' }],
            },
          },
        ],
      }
    );
    const session = buildSession(
      [source, visualModel],
      [{ sourceId: source.id, targetId: visualModel.id }]
    );

    const result = automapCanvasColumns({
      draftSession: session,
      canonicalNodesById: new Map([
        [source.id, source],
        [visualModel.id, visualModel],
      ]),
      targetNodeId: visualModel.id,
      targetColumns: [{ name: 'customer', type: 'text' }],
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const mapped = result.draftSession.localNodeCatalog?.model;
    if (mapped == null) throw new Error('Expected mapped Transform node.');
    const authority = readDvtTransformAuthoringAuthority(mapped);
    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    expect(result.appliedCount).toBe(1);
  });

  it('removes the selected semantic input relation instead of a persisted React Flow edge', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const initial = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);
    const mappedResult = applyCanvasColumnMapping({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      source: { nodeId: source.id, columnName: 'event_id' },
      target: { nodeId: model.id, columnName: 'event_id', dataType: 'integer' },
    });
    const mapped = readMappedTransform(mappedResult);

    const removed = removeCanvasColumnMapping({
      draftSession: mappedResult.outcome === 'applied' ? mappedResult.draftSession : initial,
      targetNode: mapped,
      outputId: 'output:event_id',
      source: { nodeId: source.id, columnName: 'event_id' },
    });

    expect(removed.outcome).toBe('applied');
    if (removed.outcome !== 'applied') return;
    const updated = removed.draftSession.localNodeCatalog?.model;
    if (updated == null) throw new Error('Expected updated transform node.');
    const authority = readDvtTransformAuthoringAuthority(updated);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.visual) return;
    expect(authority.recipe.outputs).toEqual([]);
    expect(resolveCanvasColumnMappingTarget(updated, 'event_id')).toEqual({
      nodeId: 'model',
      columnName: 'event_id',
    });
    expect(removed.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source', targetId: 'model' },
    ]);
  });
});
