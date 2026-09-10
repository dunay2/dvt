// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';

import type { CanonicalNode } from '../../types/canonical';
import { type CanvasDraftSession } from './canvasDraftSession';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import {
  useCanvasColumnOutputCommandRunner,
  type CanvasColumnOutputCommandRunner,
} from './useCanvasColumnOutputCommandRunner';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
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

function buildSavingSession(): CanvasDraftSession {
  const workingSet = {
    visibleNodeIds: [source.id],
    visibleEdges: [],
    pendingExplicitNodeIds: [],
  };
  return {
    syncState: 'saving',
    baseline: { record: null },
    workingSet,
    draftRevision: 'rev-1',
    savingWorkingSet: workingSet,
    savingBaseRevision: 'rev-1',
    savingLocalNodeCatalog: { [source.id]: source },
    localNodeCatalog: { [source.id]: source },
  };
}

describe('useCanvasColumnOutputCommandRunner', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('serializes Source toggle and reorder while an autosave is in flight', () => {
    let runner!: CanvasColumnOutputCommandRunner;
    let currentSession = buildSavingSession();
    const setDraftSession = vi.fn<Dispatch<SetStateAction<CanvasDraftSession>>>((action) => {
      currentSession = typeof action === 'function' ? action(currentSession) : action;
    });

    function Harness(): null {
      runner = useCanvasColumnOutputCommandRunner({
        state: {
          canonicalNodesById: new Map([[source.id, source]]),
          draftSession: currentSession,
        },
        effects: { setDraftSession },
      });
      return null;
    }

    act(() => root.render(<Harness />));
    expect(
      runner.toggleOutput({
        nodeId: source.id,
        columnId: 'customer',
        columnType: 'text',
        output: false,
      })
    ).toMatchObject({ outcome: 'applied' });
    expect(
      runner.reorderOutput({
        nodeId: source.id,
        columnId: 'amount',
        targetColumnId: 'order_id',
        placement: 'before',
      })
    ).toMatchObject({ outcome: 'applied' });

    const projectedSource = currentSession.localNodeCatalog?.[source.id];
    if (projectedSource == null) throw new Error('Expected updated Source projection.');
    expect(
      readDvtSourceOutputProjection(projectedSource)?.outputs.map((field) => field.name)
    ).toEqual(['amount', 'order_id']);
    expect(currentSession.syncState).toBe('saving');
    expect(currentSession.savingLocalNodeCatalog).toEqual({ [source.id]: source });
    expect(setDraftSession).toHaveBeenCalledTimes(2);
  });
});
