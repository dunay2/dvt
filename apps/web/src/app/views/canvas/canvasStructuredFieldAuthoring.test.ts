import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from './canvasDvtSubstraitStructuredField';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  applyCanvasStructuredField,
  reorderCanvasStructuredFieldChildren,
} from './canvasStructuredFieldAuthoring';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: [],
  metadata: {
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
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'numeric' },
    ],
  },
};

function transform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: source.metadata!.connectedSourceRef as never,
      fields: source.metadata!.columns as never,
    },
    targetNodeId: 'transform-orders',
    outputs: ['order_id', 'customer', 'amount'].map((name) => ({
      fieldId: `output:${name}`,
      name,
      sourceFieldName: name,
    })),
  });
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Transform orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

function session(target: CanonicalNode): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: [source.id, target.id],
      visibleEdges: [{ sourceId: source.id, targetId: target.id }],
      pendingExplicitNodeIds: [],
    },
    draftRevision: 'revision-7',
    localNodeCatalog: { [source.id]: source, [target.id]: target },
  };
}

describe('ConfigureCanvasDvtNode structured-field command', () => {
  it('updates the canonical semantic authority and preserves the draft revision', () => {
    const target = transform();
    const result = applyCanvasStructuredField({
      draftSession: session(target),
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: target.id,
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentName: 'identity',
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.draftSession.draftRevision).toBe('revision-7');
    const updated = result.draftSession.localNodeCatalog?.[target.id];
    if (updated == null) throw new Error('Expected updated Transform.');
    const authority = readDvtTransformAuthoringAuthority(updated)!;
    const inspection = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitStructuredFieldDocument(authority.semanticDocument)
    );
    const created = inspection.ok ? inspection.fields[0] : null;
    expect(created).toMatchObject({
      name: 'identity',
      children: [{ name: 'order_id' }, { name: 'customer' }],
    });
    expect(created?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(created?.fieldId).not.toContain('identity');
  });

  it('rejects an unsupported node without mutating the session', () => {
    const target = { ...transform(), kind: 'dvt:sink' as const, role: 'output' as const };
    const draftSession = session(target);
    expect(
      applyCanvasStructuredField({
        draftSession,
        canonicalNodesById: new Map(),
        request: {
          nodeId: target.id,
          draggedFieldId: 'output:customer',
          targetFieldId: 'output:order_id',
          parentName: 'identity',
        },
      })
    ).toEqual({ outcome: 'rejected' });
    expect(draftSession.localNodeCatalog?.[target.id]).toBe(target);
  });

  it('reorders nested children through the same draft command boundary', () => {
    const target = transform();
    const composed = applyCanvasStructuredField({
      draftSession: session(target),
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: target.id,
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentName: 'identity',
      },
    });
    if (composed.outcome !== 'applied') throw new Error('Expected structured field creation.');
    const persistedTarget = composed.draftSession.localNodeCatalog?.[target.id];
    if (persistedTarget == null) throw new Error('Expected composed Transform.');
    const persistedAuthority = readDvtTransformAuthoringAuthority(persistedTarget)!;
    const persistedInspection = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitStructuredFieldDocument(persistedAuthority.semanticDocument)
    );
    const parentFieldId = persistedInspection.ok ? persistedInspection.fields[0]?.fieldId : undefined;
    if (parentFieldId == null) throw new Error('Expected stable structured parent FieldId.');

    const persistedSession: CanvasDraftSession = {
      ...composed.draftSession,
      baseline: {
        record: {
          revision: 'revision-8',
          savedAt: '2026-09-03T00:00:00.000Z',
          draft: buildCanvasAuthoringDraft({
            canvas: { kind: 'transformation', title: 'Structured reorder' },
            nodeIds: [source.id, persistedTarget.id],
            nodePositions: {
              [source.id]: { x: 0, y: 0 },
              [persistedTarget.id]: { x: 320, y: 0 },
            },
            visibleEdges: [{ sourceId: source.id, targetId: persistedTarget.id }],
            canonicalNodes: [source, persistedTarget],
            canonicalEdges: [],
          }),
        },
      },
      draftRevision: 'revision-8',
      localNodeCatalog: undefined,
    };

    const result = reorderCanvasStructuredFieldChildren({
      draftSession: persistedSession,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: target.id,
        parentFieldId,
        fieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        placement: 'before',
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const updated = result.draftSession.localNodeCatalog?.[target.id];
    const authority = readDvtTransformAuthoringAuthority(updated!)!;
    const inspection = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitStructuredFieldDocument(authority.semanticDocument)
    );
    expect(inspection.ok ? inspection.fields[0]?.fieldId : null).toBe(parentFieldId);
    expect(inspection.ok ? inspection.fields[0]?.children : null).toMatchObject([
      { fieldId: 'output:customer' },
      { fieldId: 'output:order_id' },
    ]);
  });
});
