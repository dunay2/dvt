// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasSourceOutputInitialization } from './useCanvasSourceOutputInitialization';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import {
  readCanvasDvtCompositionInputCatalog,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

type TerminalFixture = Readonly<{
  graph: ReturnType<typeof occurrenceGraph>;
  occurrence: PendingSourceOccurrence;
  fields: PendingSourceOccurrence['read']['fields'];
  rootId: string;
  inputs: readonly CanvasDvtCompositionInput[];
}>;

function terminalFixture(): TerminalFixture {
  const graph = occurrenceGraph();
  const index = indexSubstraitRelations(graph.draft);
  if (!index.ok) throw index.error;
  const read = [...index.index.relations.values()].find(
    (entry) => entry.relation.relType.case === 'read'
  );
  if (read?.binding.displayName == null) throw new Error('Expected a named Source occurrence.');
  const fields = read.fields.filter((field) => field.parentFieldId == null);
  const occurrence: PendingSourceOccurrence = {
    sourceNodeId: graph.source.id,
    read: { ...read, binding: { ...read.binding, displayName: read.binding.displayName } },
    initialOutputFieldIds: [fields[0]!.fieldId],
  };
  const { inputs } = readCanvasDvtCompositionInputCatalog({
    targetNodeId: graph.targetNode.id,
    nodes: graph.nodes,
    edges: graph.edges,
  });
  return { graph, occurrence, fields, rootId: index.index.rootId, inputs };
}

type InitializationAuthority = Omit<
  Parameters<typeof useCanvasSourceOutputInitialization>[0],
  'state'
>;
type InitializationHost = Readonly<{
  state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
  status: ReturnType<typeof useCanvasSourceOutputInitialization>;
  connect: (
    fixture: TerminalFixture,
    sources?: readonly PendingSourceOccurrence[]
  ) => Promise<void>;
  updateAuthority: (update: Partial<InitializationAuthority>) => Promise<void>;
  close: () => void;
}>;

async function initializationHost(authority: InitializationAuthority): Promise<InitializationHost> {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let state!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
  let status!: ReturnType<typeof useCanvasSourceOutputInitialization>;
  function Host(): null {
    state = useCanvasRelationalTreeDraftState();
    status = useCanvasSourceOutputInitialization({ state, ...authority });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(<Host />));
  return {
    get state() {
      return state;
    },
    get status() {
      return status;
    },
    connect: async (
      fixture: TerminalFixture,
      sources: readonly PendingSourceOccurrence[] = [fixture.occurrence]
    ) => {
      await act(async () => {
        state.setActive(true);
        state.setJoinDraft(fixture.graph.draft);
        state.setPendingSources(sources);
        state.setOutputRelationId(fixture.rootId);
      });
    },
    updateAuthority: async (update: Partial<InitializationAuthority>) => {
      authority = { ...authority, ...update };
      await act(async () => root.render(<Host />));
    },
    close: () => {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    },
  };
}

function deferCanonicalQuery(): Readonly<{
  release: () => void;
  signal: AbortSignal | undefined;
  restore: () => void;
}> {
  const query = CanvasRelationAnalysisSession.prototype.query;
  let release!: () => void;
  let signal: AbortSignal | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const spy = vi
    .spyOn(CanvasRelationAnalysisSession.prototype, 'query')
    .mockImplementationOnce(async function (
      this: CanvasRelationAnalysisSession,
      relationId,
      requestSignal
    ) {
      signal = requestSignal;
      await gate;
      return query.call(this, relationId, requestSignal);
    });
  return {
    release,
    get signal() {
      return signal;
    },
    restore: () => spy.mockRestore(),
  };
}

async function outputNames(
  document: SubstraitDocument | null
): Promise<readonly (string | undefined)[]> {
  if (document == null) throw new Error('Expected a terminal Output document.');
  const session = new CanvasRelationAnalysisSession('initialization-test-oracle');
  try {
    session.receive(document);
    return (await session.query(null)).bindings
      .filter((field) => field.parentFieldId == null)
      .map((field) => field.displayName);
  } finally {
    session.dispose();
  }
}

describe('terminal Source initialization lifetime', () => {
  it('materializes canonical terminal Output and consumes only reachable occurrence preferences', async () => {
    const fixture = terminalFixture();
    const unrelated = {
      ...createPendingSourceOccurrence(fixture.inputs[0]!),
      initialOutputFieldIds: [],
    };
    const host = await initializationHost({
      editable: true,
      inputs: fixture.inputs,
      nodeId: fixture.graph.targetNode.id,
      nodes: fixture.graph.nodes,
      edges: fixture.graph.edges,
    });
    try {
      await host.connect(fixture, [fixture.occurrence, unrelated]);
      expect(host.status).toEqual({ blocked: false, pending: false, failed: false });
      expect(await outputNames(host.state.joinDraft)).toEqual(['id', 'parent_id', 'places_id_2']);
      expect(host.state.pendingSources[0]?.initialOutputFieldIds).toBeUndefined();
      expect(host.state.pendingSources[1]).toEqual(unrelated);
      const before = indexSubstraitRelations(fixture.graph.draft);
      const after = indexSubstraitRelations(host.state.joinDraft!);
      if (!before.ok || !after.ok) throw new Error('Expected valid canonical documents.');
      for (const [id, entry] of before.index.relations)
        if (id !== fixture.rootId) expect(after.index.relations.get(id)).toEqual(entry);
    } finally {
      host.close();
    }
  });

  it.each(['missing connection', 'denied Input'] as const)(
    'recovers from %s without replacing the graph snapshot',
    async (failure) => {
      const fixture = terminalFixture();
      const deniedEdges = fixture.graph.edges.map((edge) => ({
        ...edge,
        inputBindings: { version: 'v1' as const, fields: [] },
      }));
      const host = await initializationHost({
        editable: true,
        inputs: failure === 'missing connection' ? [] : fixture.inputs,
        nodeId: fixture.graph.targetNode.id,
        nodes: fixture.graph.nodes,
        edges: failure === 'denied Input' ? deniedEdges : fixture.graph.edges,
      });
      let delayed: ReturnType<typeof deferCanonicalQuery> | undefined;
      try {
        await host.connect(fixture);
        const snapshot = host.state.graphSnapshot;
        expect(host.status).toEqual({ blocked: true, pending: false, failed: true });
        expect(await outputNames(host.state.joinDraft)).toHaveLength(4);
        expect(host.state.pendingSources[0]?.initialOutputFieldIds).toEqual(
          fixture.occurrence.initialOutputFieldIds
        );
        delayed = deferCanonicalQuery();
        await host.updateAuthority({ inputs: fixture.inputs, edges: fixture.graph.edges });
        expect(delayed.signal).toBeDefined();
        expect(host.state.graphSnapshot).toBe(snapshot);
        expect(host.status).toEqual({ blocked: true, pending: true, failed: false });
        await act(async () => delayed!.release());
        delayed.restore();
        expect(host.status).toEqual({ blocked: false, pending: false, failed: false });
        expect(await outputNames(host.state.joinDraft)).toEqual(['id', 'parent_id', 'places_id_2']);
        expect(host.state.pendingSources[0]?.initialOutputFieldIds).toBeUndefined();
      } finally {
        delayed?.release();
        delayed?.restore();
        host.close();
      }
    }
  );

  it.each(['Cancel', 'new preference'] as const)(
    'prevents obsolete asynchronous completion from publishing after %s',
    async (change) => {
      const fixture = terminalFixture();
      const host = await initializationHost({
        editable: true,
        inputs: fixture.inputs,
        nodeId: fixture.graph.targetNode.id,
        nodes: fixture.graph.nodes,
        edges: fixture.graph.edges,
      });
      const delayed = deferCanonicalQuery();
      try {
        await host.connect(fixture);
        expect(host.status.pending).toBe(true);
        expect(delayed.signal?.aborted).toBe(false);
        if (change === 'Cancel') act(() => host.state.reset());
        else
          await act(async () =>
            host.state.setPendingSources([
              { ...fixture.occurrence, initialOutputFieldIds: [fixture.fields[1]!.fieldId] },
            ])
          );
        expect(delayed.signal?.aborted).toBe(true);
        const accepted = host.state.joinDraft;
        await act(async () => delayed.release());
        delayed.restore();
        expect(host.state.joinDraft).toBe(accepted);
        expect(host.status).toEqual({ blocked: false, pending: false, failed: false });
        if (change === 'Cancel') {
          expect(host.state.joinDraft).toBeNull();
          expect(host.state.pendingSources).toEqual([]);
        } else {
          expect(await outputNames(host.state.joinDraft)).toEqual([
            'id',
            'parent_id',
            'places_parent_id_2',
          ]);
          expect(host.state.pendingSources[0]?.initialOutputFieldIds).toBeUndefined();
        }
      } finally {
        delayed.release();
        delayed.restore();
        host.close();
      }
    }
  );

  it('cancels when editing authority is revoked and retries when it returns on the same graph', async () => {
    const fixture = terminalFixture();
    const host = await initializationHost({
      editable: true,
      inputs: fixture.inputs,
      nodeId: fixture.graph.targetNode.id,
      nodes: fixture.graph.nodes,
      edges: fixture.graph.edges,
    });
    const delayed = deferCanonicalQuery();
    try {
      await host.connect(fixture);
      const snapshot = host.state.graphSnapshot;
      await host.updateAuthority({ editable: false });
      expect(delayed.signal?.aborted).toBe(true);
      await act(async () => delayed.release());
      delayed.restore();
      expect(host.state.graphSnapshot).toBe(snapshot);
      expect(await outputNames(host.state.joinDraft)).toHaveLength(4);
      expect(host.state.pendingSources[0]?.initialOutputFieldIds).toEqual(
        fixture.occurrence.initialOutputFieldIds
      );
      await host.updateAuthority({ editable: true });
      expect(host.status).toEqual({ blocked: false, pending: false, failed: false });
      expect(await outputNames(host.state.joinDraft)).toEqual(['id', 'parent_id', 'places_id_2']);
      expect(host.state.pendingSources[0]?.initialOutputFieldIds).toBeUndefined();
    } finally {
      delayed.release();
      delayed.restore();
      host.close();
    }
  });

  it('keeps unconfigured terminal preferences savable as incomplete intent and discards them on Cancel', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const input = {
      ...occurrenceInput.source,
      fields: occurrenceInput.fields.map((name) => ({
        name,
        dataType: 'bigint',
        joinDataType: 'i64' as const,
      })),
    };
    const source = { ...createPendingSourceOccurrence(input), initialOutputFieldIds: [] };
    let state!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    let status!: ReturnType<typeof useCanvasSourceOutputInitialization>;
    function Host(): null {
      state = useCanvasRelationalTreeDraftState();
      status = useCanvasSourceOutputInitialization({
        state,
        editable: true,
        inputs: [input],
        nodeId: 'model',
        nodes: [],
        edges: [],
      });
      return null;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => root.render(<Host />));
      act(() => {
        state.setActive(true);
        state.setPendingSources([source]);
      });
      expect(status.blocked).toBe(false);
      expect(state.pendingSources[0]?.initialOutputFieldIds).toEqual([]);
      act(() => {
        state.setStagedOperations([
          { id: 'unconfigured-operation', operation: 'filter', inputs: [null] },
        ]);
        state.setOutputRelationId('unconfigured-operation');
      });
      expect(status.blocked).toBe(false);
      act(() =>
        state.setStagedOperations([
          {
            id: 'unconfigured-operation',
            operation: 'filter',
            inputs: [source.read.binding.relationId],
          },
        ])
      );
      expect(status.blocked).toBe(false);
      expect(state.pendingSources[0]?.initialOutputFieldIds).toEqual([]);
      act(() => state.reset());
      expect(status.blocked).toBe(false);
      expect(state.joinDraft).toBeNull();
      expect(state.pendingSources).toEqual([]);
    } finally {
      act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
