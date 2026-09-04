// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import { reorderCanvasSourceColumns } from './canvasSourceColumnOrder';
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
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { createDvtSourceSemanticDraft } from './canvasDvtSourceSemanticAuthoring';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
} from './useCanvasGraphHandlers.test.support';

const source: CanonicalNode = {
  id: 'source-1',
  name: 'source_1',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source', 'public'],
  metadata: {
    connectionId: 'postgres',
    columns: [
      { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
      { name: 'customer', type: 'text', nullable: false, description: 'Customer name' },
      { name: 'amount', type: 'numeric', nullable: false },
    ],
  },
};

const semanticSource: CanonicalNode = {
  ...source,
  metadata: {
    ...source.metadata,
    schema: 'public',
    tableName: 'source_1',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres',
        provider: 'postgres',
      },
      sourceObjectId: 'public.source_1',
    },
  },
};

function filteredSemanticSource(): CanonicalNode {
  const projectionSource = resolveDvtSubstraitProjectionSource(semanticSource);
  const capability = resolveDvtSubstraitFilterCapabilities({
    dataType: 'text',
    provider: 'postgres',
  })[0];
  if (projectionSource == null || capability == null) {
    throw new Error('Expected an admitted filtered Source fixture.');
  }
  const filtered = applyDvtSubstraitFilter(
    createDvtSubstraitProjectionDraft({
      source: projectionSource,
      targetNodeId: semanticSource.id,
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
  return applyDvtSubstraitSemanticDocument(
    semanticSource,
    encodeDvtSubstraitFilterDocument(filtered)
  );
}

describe('Canvas Source column order', () => {
  beforeEach(resetGraphHandlersTestDoubles);
  afterEach(restoreGraphHandlersTestDoubles);

  it('moves a column while preserving the complete Source declaration', () => {
    const result = reorderCanvasSourceColumns({
      draftSession: buildDraftSession(),
      canonicalNodesById: new Map([[source.id, source]]),
      nodeId: source.id,
      columnName: 'customer',
      targetColumnName: 'order_id',
      placement: 'before',
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;

    const updated = result.draftSession.localNodeCatalog?.[source.id];
    expect(updated?.metadata).toMatchObject({ connectionId: 'postgres' });
    expect(updated?.metadata?.columns).toEqual([
      { name: 'customer', type: 'text', nullable: false, description: 'Customer name' },
      { name: 'order_id', type: 'integer', nullable: false, primaryKey: true },
      { name: 'amount', type: 'numeric', nullable: false },
    ]);
  });

  it('reorders a filtered Source atomically without losing its columns or filter', () => {
    const filteredSource = filteredSemanticSource();
    const result = reorderCanvasSourceColumns({
      draftSession: buildDraftSession(),
      canonicalNodesById: new Map([[filteredSource.id, filteredSource]]),
      nodeId: filteredSource.id,
      columnName: 'output:customer',
      targetColumnName: 'output:order_id',
      placement: 'before',
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;

    const updated = result.draftSession.localNodeCatalog?.[filteredSource.id];
    if (updated == null) throw new Error('Expected an updated filtered Source.');
    const truth = projectCanvasNodePresentationTruth({
      node: updated,
      nodes: [updated],
      edges: [],
    });
    const semanticDraft = createDvtSourceSemanticDraft(updated);

    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'customer',
      'order_id',
      'amount',
    ]);
    expect(semanticDraft == null ? null : inspectDvtSubstraitFilter(semanticDraft)).toMatchObject({
      fieldId: 'output:customer',
      value: 'Ada',
    });
    expect(updated.metadata?.columns).toEqual(semanticSource.metadata?.columns);
  });

  it('repairs a persisted order-only divergence before presenting or saving the Source', () => {
    const filteredSource = filteredSemanticSource();
    const columns = filteredSource.metadata?.columns;
    if (!Array.isArray(columns)) throw new Error('Expected Source columns.');
    const divergentSource: CanonicalNode = {
      ...filteredSource,
      metadata: {
        ...filteredSource.metadata,
        columns: [columns[1], columns[0], columns[2]],
      },
    };

    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: [divergentSource.id],
      visibleEdges: [],
      draftSemanticGraph: { canonicalNodes: [divergentSource], canonicalEdges: [] },
      localCanonicalNodes: [],
    });
    const reconciled = projection.canonicalNodesById.get(divergentSource.id);
    if (reconciled == null) throw new Error('Expected a reconciled Source.');
    const truth = projectCanvasNodePresentationTruth({
      node: reconciled,
      nodes: projection.canonicalNodes,
      edges: [],
    });
    const semanticDraft = createDvtSourceSemanticDraft(reconciled);

    expect(truth.columns.visible.map((column) => column.name)).toEqual([
      'customer',
      'order_id',
      'amount',
    ]);
    expect(reconciled.metadata?.columns).toEqual(semanticSource.metadata?.columns);
    expect(semanticDraft == null ? null : inspectDvtSubstraitFilter(semanticDraft)).toMatchObject({
      fieldId: 'output:customer',
      value: 'Ada',
    });
  });

  it('rejects reordering outside a Source declaration', () => {
    const result = reorderCanvasSourceColumns({
      draftSession: buildDraftSession(),
      canonicalNodesById: new Map([
        [source.id, { ...source, kind: 'dvt:transform', role: 'transform' }],
      ]),
      nodeId: source.id,
      columnName: 'customer',
      targetColumnName: 'order_id',
      placement: 'before',
    });

    expect(result).toEqual({ outcome: 'rejected', reason: 'not_source' });
  });

  it('routes the shared column gesture to the Source command', async () => {
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source],
      draftSession: buildDraftSession(),
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleReorderCanvasColumnOutput({
        nodeId: source.id,
        columnId: 'amount',
        targetColumnId: 'order_id',
        placement: 'before',
      });
    });

    const columns = setDraftSession.mock.calls[0]?.[0]?.localNodeCatalog?.[source.id]?.metadata
      ?.columns as Array<{ name: string }> | undefined;
    expect(columns?.map((column) => column.name)).toEqual(['amount', 'order_id', 'customer']);
    harness.cleanup();
  });
});
