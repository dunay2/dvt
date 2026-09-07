import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { createDvtSourceSemanticDraft } from './canvasDvtSourceSemanticAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const FIELD_IDS = [
  'dvt_fld_01991dc0-0000-7000-8000-000000000101',
  'dvt_fld_01991dc0-0000-7000-8000-000000000102',
  'dvt_fld_01991dc0-0000-7000-8000-000000000103',
] as const;

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

function semanticSource(): CanonicalNode {
  const projectionSource = resolveDvtSubstraitProjectionSource(source);
  if (projectionSource == null) throw new Error('Invalid Source fixture.');
  const draft = createDvtSubstraitProjectionDraft({
    source: projectionSource,
    targetNodeId: source.id,
    outputs: projectionSource.fields.map((field, index) => ({
      fieldId: FIELD_IDS[index]!,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
  return applyDvtSubstraitSemanticDocument(source, encodeDvtSubstraitProjectionDocument(draft));
}

function legacyFilteredSource(): CanonicalNode {
  const semantic = semanticSource();
  const draft = createDvtSourceSemanticDraft(semantic);
  const capability = resolveDvtSubstraitFilterCapabilities({
    dataType: 'text',
    provider: 'postgres',
  })[0];
  if (draft == null || capability == null) throw new Error('Invalid Source fixture.');
  const filtered = applyDvtSubstraitFilter(draft, {
    fieldId: FIELD_IDS[1],
    dataType: 'text',
    capabilityId: capability.capabilityId,
    value: 'Ada',
  });
  return applyDvtSubstraitSemanticDocument(source, encodeDvtSubstraitFilterDocument(filtered));
}

describe('DVT Source semantic authority', () => {
  it('fails closed on a retired filtered Source authority instead of normalizing it', () => {
    expect(() => createDvtSourceSemanticDraft(legacyFilteredSource())).toThrow(
      'DVT Source semantic authority is not an admitted projection shape.'
    );
  });

  it('does not repair persisted semantic order from physical column names during projection', () => {
    const semantic = semanticSource();
    const columns = semantic.metadata?.columns;
    if (!Array.isArray(columns)) throw new Error('Expected Source columns.');
    const divergent: CanonicalNode = {
      ...semantic,
      metadata: { ...semantic.metadata, columns: [...columns].reverse() },
    };
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: [divergent.id],
      visibleEdges: [],
      draftSemanticGraph: { canonicalNodes: [divergent], canonicalEdges: [] },
      localCanonicalNodes: [],
    });
    const projected = projection.canonicalNodesById.get(divergent.id);

    expect(projected?.metadata?.columns).toEqual([...columns].reverse());
    expect(projected?.metadata?.transformAuthoring).toEqual(divergent.metadata?.transformAuthoring);
  });
});
