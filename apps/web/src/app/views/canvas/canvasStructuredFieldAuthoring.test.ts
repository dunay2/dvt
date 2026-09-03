import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
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
import { applyCanvasStructuredField } from './canvasStructuredFieldAuthoring';

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
    expect(inspection.ok ? inspection.fields[0] : null).toMatchObject({
      name: 'identity',
      children: [{ name: 'order_id' }, { name: 'customer' }],
    });
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
});
