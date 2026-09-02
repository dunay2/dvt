// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { reorderCanvasSourceColumns } from './canvasSourceColumnOrder';
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
