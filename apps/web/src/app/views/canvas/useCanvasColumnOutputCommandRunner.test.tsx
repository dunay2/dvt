// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { type CanvasDraftSession } from './canvasDraftSession';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
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

function buildProjectionTransform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: source.metadata!.connectedSourceRef as never,
      fields: source.metadata!.columns as never,
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
      { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
    ],
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

  it('serializes two calculated-output submissions over the latest draft', () => {
    const transform = buildProjectionTransform();
    let runner!: CanvasColumnOutputCommandRunner;
    let currentSession: CanvasDraftSession = {
      syncState: 'editing',
      baseline: { record: null },
      workingSet: {
        visibleNodeIds: [source.id, transform.id],
        visibleEdges: [{ sourceId: source.id, targetId: transform.id }],
        pendingExplicitNodeIds: [],
      },
      draftRevision: 'rev-1',
      localNodeCatalog: { [source.id]: source, [transform.id]: transform },
    };
    let commandCalls = 0;
    const runDraftSessionCommand: CanvasDraftSessionCommandRunner = (command) => {
      commandCalls += 1;
      const result = command(currentSession);
      if (result.outcome === 'applied') currentSession = result.draftSession;
      return result;
    };

    function Harness(): null {
      runner = useCanvasColumnOutputCommandRunner({
        state: {
          canonicalNodesById: new Map([
            [source.id, source],
            [transform.id, transform],
          ]),
          draftSession: currentSession,
        },
        effects: { runDraftSessionCommand },
      });
      return null;
    }

    act(() => root.render(<Harness />));
    const request = {
      nodeId: transform.id,
      kind: 'field-ref' as const,
      alias: 'customer_alias',
      inputFieldId: 'output:customer',
    };
    expect(runner.addCalculated(request)).toMatchObject({ outcome: 'applied' });
    expect(runner.addCalculated(request)).toEqual({
      outcome: 'rejected',
      reason: 'duplicate_alias',
    });
    expect(commandCalls).toBe(2);

    const updated = currentSession.localNodeCatalog?.[transform.id];
    if (updated == null) throw new Error('Expected updated Transform.');
    const authority = readDvtTransformAuthoringAuthority(updated);
    if (authority?.mode !== 'substrait') throw new Error('Expected Substrait authority.');
    const inspection = inspectDvtSubstraitProjectionDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    expect(inspection.ok && inspection.projection.outputs.map((output) => output.name)).toEqual([
      'order_id',
      'customer',
      'amount',
      'customer_alias',
    ]);
  });

  it('serializes Source toggle and reorder while an autosave is in flight', () => {
    let runner!: CanvasColumnOutputCommandRunner;
    let currentSession = buildSavingSession();
    let commandCalls = 0;
    const runDraftSessionCommand: CanvasDraftSessionCommandRunner = (command) => {
      commandCalls += 1;
      const result = command(currentSession);
      if (result.outcome === 'applied') currentSession = result.draftSession;
      return result;
    };

    function Harness(): null {
      runner = useCanvasColumnOutputCommandRunner({
        state: {
          canonicalNodesById: new Map([[source.id, source]]),
          draftSession: currentSession,
        },
        effects: { runDraftSessionCommand },
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
    expect(commandCalls).toBe(2);
  });
});
