import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  inspectDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { createDvtSourceSemanticDraft } from './canvasDvtSourceSemanticAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const source: CanonicalNode = {
  id: 'source-1',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'public.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'numeric' },
    ],
  },
};

function legacyFilteredSource(): CanonicalNode {
  const projectionSource = resolveDvtSubstraitProjectionSource(source);
  const capability = resolveDvtSubstraitFilterCapabilities({
    dataType: 'text',
    provider: 'postgres',
  })[0];
  if (projectionSource == null || capability == null) throw new Error('Invalid Source fixture.');
  const filtered = applyDvtSubstraitFilter(
    createDvtSubstraitProjectionDraft({
      source: projectionSource,
      targetNodeId: source.id,
      outputs: projectionSource.fields.map((field) => ({
        fieldId: `output:${field.name}`,
        name: field.name,
        sourceFieldName: field.name,
      })),
    }),
    {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: 'Ada',
    }
  );
  return applyDvtSubstraitSemanticDocument(source, encodeDvtSubstraitFilterDocument(filtered));
}

describe('DVT Source semantic authority', () => {
  it('normalizes a legacy Source filter without changing physical identity', () => {
    const legacy = legacyFilteredSource();
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: [legacy.id],
      visibleEdges: [],
      draftSemanticGraph: { canonicalNodes: [legacy], canonicalEdges: [] },
      localCanonicalNodes: [],
    });
    const normalized = projection.canonicalNodesById.get(legacy.id);
    if (normalized == null) throw new Error('Expected normalized Source.');

    const draft = createDvtSourceSemanticDraft(normalized);
    expect(draft == null ? null : inspectDvtSubstraitFilter(draft)).toBeNull();
    expect(normalized).toMatchObject({
      id: source.id,
      pluginId: source.pluginId,
      kind: 'dvt:source',
      role: 'input',
      metadata: {
        connectedSourceRef: source.metadata?.connectedSourceRef,
        columns: source.metadata?.columns,
      },
    });
  });

  it('repairs a persisted semantic order to the physical Source declaration', () => {
    const legacy = legacyFilteredSource();
    const columns = legacy.metadata?.columns;
    if (!Array.isArray(columns)) throw new Error('Expected Source columns.');
    const divergent = {
      ...legacy,
      metadata: { ...legacy.metadata, columns: [...columns].reverse() },
    };
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: [divergent.id],
      visibleEdges: [],
      draftSemanticGraph: { canonicalNodes: [divergent], canonicalEdges: [] },
      localCanonicalNodes: [],
    });
    const normalized = projection.canonicalNodesById.get(divergent.id);

    expect(normalized?.metadata?.columns).toEqual(source.metadata?.columns);
  });
});
