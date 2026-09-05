import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { applyCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import { automapCanvasColumns } from './canvasColumnAutomap';
import {
  reorderCanvasColumnOutput,
  setCanvasColumnOutputIncluded,
} from './canvasColumnOutputAuthoring';
import { resolveCanvasColumnMappingTarget } from './canvasColumnProjectionAuthority';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  applyDvtSubstraitProjectionFunction,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function readOutputFieldId(node: CanonicalNode, name: string): string {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority?.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
    throw new Error('Expected canonical Substrait authority.');
  }
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
  if (!inspection.ok) throw new Error('Expected inspectable projection.');
  const output = inspection.projection.outputs.find((candidate) => candidate.name === name);
  if (output == null) throw new Error(`Expected output ${name}.`);
  return output.fieldId;
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
    const authority = readDvtTransformAuthoringAuthority(mapped)!;

    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    expect(mapped.metadata).not.toHaveProperty('sql');
  });

  it('creates one canonical passthrough output with an opaque allocated FieldId', () => {
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
    const authority = readDvtTransformAuthoringAuthority(mapped)!;

    expect(authority.mode).toBe(DVT_TRANSFORM_AUTHORING_MODE.substrait);
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs).toEqual([
      expect.objectContaining({
        name: 'event_id',
        sourceFieldName: 'event_id',
      }),
    ]);
    expect(inspection.projection.outputs[0]?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(inspection.projection.outputs[0]?.fieldId).not.toContain('event_id');
    expect(session.localNodeCatalog?.model?.metadata).not.toHaveProperty('transformAuthoring');
  });

  it('does not accept a caller-fabricated output id when creating a new mapping', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'event_id', type: 'integer' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const session = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);

    const result = applyCanvasColumnMapping({
      draftSession: session,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      source: { nodeId: source.id, columnName: 'event_id' },
      target: {
        nodeId: model.id,
        outputId: 'output:event_id',
        columnName: 'event_id',
        dataType: 'integer',
      },
    });
    const mapped = readMappedTransform(result);
    const fieldId = readOutputFieldId(mapped, 'event_id');

    expect(fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(fieldId).not.toBe('output:event_id');
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
    const stableOutputId = readOutputFieldId(mapped, 'event_id');
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
        outputId: stableOutputId,
        columnName: 'event_id',
        dataType: 'integer',
      },
    });
    const changed = readMappedTransform(secondResult);
    const authority = readDvtTransformAuthoringAuthority(changed)!;

    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]).toMatchObject({
      fieldId: stableOutputId,
      sourceFieldName: 'renamed_id',
    });
    expect(inspection.projection.source.sourceRef.sourceObjectId).toBe('public.source-2');
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
    const authority = readDvtTransformAuthoringAuthority(mapped)!;

    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]?.sourceFieldName).toBe('customer');
  });

  it('preserves LOWER while another opaque output mapping is added', () => {
    const source = buildNode('source', 'dvt:source', 'input', [
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'numeric' },
    ]);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const initial = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);
    const firstResult = applyCanvasColumnMapping({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [model.id, model],
      ]),
      source: { nodeId: source.id, columnName: 'customer' },
      target: { nodeId: model.id, columnName: 'customer', dataType: 'text' },
    });
    const mapped = readMappedTransform(firstResult);
    const customerOutputId = readOutputFieldId(mapped, 'customer');
    const authority = readDvtTransformAuthoringAuthority(mapped)!;
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const lower = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'lower');
    if (lower == null) throw new Error('Expected admitted lower capability.');
    const withLowerDraft = applyDvtSubstraitProjectionFunction(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument),
      {
        fieldId: customerOutputId,
        capabilityId: lower.capabilityId,
        alias: 'customer',
        dataType: 'text',
        provider: 'postgres',
      }
    );
    const withLower = applyDvtSubstraitSemanticDocument(
      mapped,
      encodeDvtSubstraitProjectionDocument(withLowerDraft)
    );
    const withLowerSession = buildSession(
      [source, withLower],
      [{ sourceId: source.id, targetId: withLower.id }]
    );

    const secondResult = applyCanvasColumnMapping({
      draftSession: withLowerSession,
      canonicalNodesById: new Map([
        [source.id, source],
        [withLower.id, withLower],
      ]),
      source: { nodeId: source.id, columnName: 'amount' },
      target: { nodeId: withLower.id, columnName: 'amount', dataType: 'numeric' },
    });
    const updated = readMappedTransform(secondResult);
    const updatedAuthority = readDvtTransformAuthoringAuthority(updated)!;
    if (updatedAuthority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(updatedAuthority.semanticDocument)
    );

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]).toEqual(
      expect.objectContaining({ fieldId: customerOutputId, operations: ['lower'] })
    );
    const amountOutput = inspection.projection.outputs[1];
    expect(amountOutput).toEqual(expect.objectContaining({ name: 'amount' }));
    expect(amountOutput?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(amountOutput?.fieldId).not.toBe(customerOutputId);
    expect(amountOutput).not.toHaveProperty('operations');
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

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_transform_authority' });
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
    const authority = readDvtTransformAuthoringAuthority(mapped)!;
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) return;
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs.map((output) => output.name)).toEqual(['event_id']);
    expect(inspection.projection.outputs[0]?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(result.appliedCount).toBe(1);
    expect(result.skippedCount).toBe(3);
  });

  it('delete and recreate allocates a fresh output FieldId without leaving canonical authority', () => {
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
    const originalFieldId = readOutputFieldId(mapped, 'event_id');

    const canonicalNodesById = new Map([
      [source.id, source],
      [model.id, model],
    ]);
    const removed = setCanvasColumnOutputIncluded({
      draftSession: mappedResult.outcome === 'applied' ? mappedResult.draftSession : initial,
      canonicalNodesById,
      targetNodeId: mapped.id,
      columnId: originalFieldId,
      columnType: 'integer',
      output: false,
    });

    expect(removed.outcome).toBe('applied');
    if (removed.outcome !== 'applied') return;
    const updated = removed.draftSession.localNodeCatalog?.model;
    if (updated == null) throw new Error('Expected updated transform node.');
    const authority = readDvtTransformAuthoringAuthority(updated)!;
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      throw new Error('Expected canonical Substrait authority after exclusion.');
    }
    const excluded = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(excluded.ok && excluded.projection.outputs).toEqual([]);

    const restored = setCanvasColumnOutputIncluded({
      draftSession: removed.draftSession,
      canonicalNodesById,
      targetNodeId: mapped.id,
      columnId: 'event_id',
      columnType: 'integer',
      output: true,
    });
    expect(restored.outcome).toBe('applied');
    if (restored.outcome !== 'applied') return;
    const restoredNode = restored.draftSession.localNodeCatalog?.model;
    if (restoredNode == null) throw new Error('Expected restored transform node.');
    const restoredFieldId = readOutputFieldId(restoredNode, 'event_id');
    expect(restoredFieldId).toMatch(OPAQUE_FIELD_ID);
    expect(restoredFieldId).not.toBe(originalFieldId);
    expect(removed.draftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source', targetId: 'model' },
    ]);
  });

  it('reorders outputs while preserving their opaque canonical field identities', () => {
    const sourceColumns = [
      { name: 'first', type: 'text' },
      { name: 'second', type: 'text' },
      { name: 'third', type: 'text' },
    ];
    const source = buildNode('source', 'dvt:source', 'input', sourceColumns);
    const model = buildNode('model', 'dvt:transform', 'transform');
    const canonicalNodesById = new Map([
      [source.id, source],
      [model.id, model],
    ]);
    const initial = buildSession([source, model], [{ sourceId: source.id, targetId: model.id }]);
    const mapped = automapCanvasColumns({
      draftSession: initial,
      canonicalNodesById,
      targetNodeId: model.id,
      targetColumns: sourceColumns,
    });
    if (mapped.outcome !== 'applied') throw new Error('Expected mapped outputs.');
    const mappedNode = mapped.draftSession.localNodeCatalog?.model;
    if (mappedNode == null) throw new Error('Expected mapped transform node.');
    const firstId = readOutputFieldId(mappedNode, 'first');
    const secondId = readOutputFieldId(mappedNode, 'second');
    const thirdId = readOutputFieldId(mappedNode, 'third');

    const reordered = reorderCanvasColumnOutput({
      draftSession: mapped.draftSession,
      canonicalNodesById,
      targetNodeId: model.id,
      columnId: thirdId,
      targetColumnId: firstId,
      placement: 'before',
    });
    if (reordered.outcome !== 'applied') throw new Error('Expected reordered outputs.');
    const updated = reordered.draftSession.localNodeCatalog?.model;
    if (updated == null) throw new Error('Expected updated transform node.');
    const authority = readDvtTransformAuthoringAuthority(updated)!;
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.substrait) {
      throw new Error('Expected canonical Substrait authority.');
    }
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(
      inspection.ok
        ? inspection.projection.outputs.map(({ fieldId, sourceFieldName }) => ({
            fieldId,
            sourceFieldName,
          }))
        : []
    ).toEqual([
      { fieldId: thirdId, sourceFieldName: 'third' },
      { fieldId: firstId, sourceFieldName: 'first' },
      { fieldId: secondId, sourceFieldName: 'second' },
    ]);
  });

  it('resolves mapping targets by actual opaque FieldId once authority exists', () => {
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
    const fieldId = readOutputFieldId(mapped, 'event_id');

    expect(resolveCanvasColumnMappingTarget(mapped, fieldId)).toEqual({
      nodeId: model.id,
      outputId: fieldId,
      columnName: 'event_id',
    });
  });
});
