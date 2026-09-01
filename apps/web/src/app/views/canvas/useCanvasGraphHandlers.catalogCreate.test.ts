// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Node } from '@xyflow/react';

import { canvasViewCopy } from './copy';
import {
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';
import { requireAuthoringNodeKind } from './useCanvasGraphHandlers.nodeAuthoring.test.support';

type DraftSession = ReturnType<typeof buildDraftSession>;
type DraftSessionUpdate = DraftSession | ((currentSession: DraftSession) => DraftSession);

function applyDraftSessionUpdate(
  update: DraftSessionUpdate | undefined,
  currentSession: DraftSession
): DraftSession {
  if (!update) {
    throw new Error('Expected a draft session update');
  }
  return typeof update === 'function' ? update(currentSession) : update;
}

function applyDraftSessionUpdates(
  updates: readonly [DraftSessionUpdate][],
  initialSession: DraftSession
): DraftSession {
  return updates.reduce(
    (currentSession, [update]) => applyDraftSessionUpdate(update, currentSession),
    initialSession
  );
}

describe('useCanvasGraphHandlers catalog node creation', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects catalog-created nodes outside the active runtime catalog', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      allowsCanonicalNode: (node) => node.kind.startsWith('dbt:'),
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:transform'));
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
    expect(toastState.info).toHaveBeenCalledWith(
      canvasViewCopy.nodeKindUnavailableForCanvasMessage
    );

    harness.cleanup();
  });

  it('creates an authoring node from the governed node catalog through the draft lifecycle', async () => {
    let currentNodes: Node[] = [];
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = nextNodes;
    });
    const setDraftSession = vi.fn();
    const draftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:transform'));
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(typeof setNodes.mock.calls[0]?.[0]).not.toBe('function');
    expect(currentNodes).toEqual([
      expect.objectContaining({
        id: 'dvt-transform-1',
        position: { x: 160, y: 120 },
        data: expect.objectContaining({
          name: 'Transform 1',
          pluginKind: 'dvt:transform',
          role: 'transform',
        }),
      }),
    ]);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = applyDraftSessionUpdate(
      setDraftSession.mock.calls[0]?.[0],
      draftSession
    );
    expect(nextDraftSession.workingSet.visibleNodeIds).toContain('dvt-transform-1');
    expect(nextDraftSession.localNodeCatalog?.['dvt-transform-1']).toEqual(
      expect.objectContaining({
        id: 'dvt-transform-1',
        kind: 'dvt:transform',
        role: 'transform',
      })
    );

    harness.cleanup();
  });

  it('preserves concurrent imported-source draft state when creating an authoring node', async () => {
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: [],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      setNodes: vi.fn(),
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dbt:model'));
    });

    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const updateDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof updateDraftSession).toBe('function');
    const concurrentImportedSourceSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: ['src_local_postgres_dvt_public_source_1'],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const nextDraftSession = applyDraftSessionUpdate(
      updateDraftSession,
      concurrentImportedSourceSession
    );
    expect(nextDraftSession.workingSet.visibleNodeIds).toEqual([
      'src_local_postgres_dvt_public_source_1',
      'dbt-model-1',
    ]);
    expect(nextDraftSession.localNodeCatalog?.['dbt-model-1']).toEqual(
      expect.objectContaining({
        id: 'dbt-model-1',
        kind: 'dbt:model',
        role: 'transform',
      })
    );

    harness.cleanup();
  });

  it('persists governed transformation template metadata through the draft lifecycle', async () => {
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: [],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      setNodes: vi.fn(),
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness
        .latest()
        ?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:transform'), undefined, {
          namePrefix: 'Filter rows',
          tags: ['template:filter-rows'],
          metadata: {
            transformationTemplateId: 'filter-rows',
            sql: 'select * from {{ source }} where {{ condition }}',
            config: {
              sql: 'select * from {{ source }} where {{ condition }}',
            },
          },
        });
    });

    const nextDraftSession = applyDraftSessionUpdate(
      setDraftSession.mock.calls[0]?.[0],
      buildDraftSession()
    );
    expect(nextDraftSession.localNodeCatalog?.['dvt-transform-1']).toEqual(
      expect.objectContaining({
        id: 'dvt-transform-1',
        name: 'Filter rows 1',
        tags: ['authoring', 'template:filter-rows'],
        metadata: expect.objectContaining({
          transformationTemplateId: 'filter-rows',
          sql: 'select * from {{ source }} where {{ condition }}',
          config: expect.objectContaining({
            sql: 'select * from {{ source }} where {{ condition }}',
          }),
        }),
      })
    );

    harness.cleanup();
  });

  it('persists explicit output target metadata through the draft lifecycle', async () => {
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: [],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      setNodes: vi.fn(),
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:sink'), undefined, {
        namePrefix: 'Analytics table',
        tags: ['target:analytics-table-replace'],
        metadata: {
          outputTargetTemplateId: 'analytics-table-replace',
          config: {
            schema: 'analytics',
            table: 'transformed_output',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
      });
    });

    const nextDraftSession = applyDraftSessionUpdate(
      setDraftSession.mock.calls[0]?.[0],
      buildDraftSession()
    );
    expect(nextDraftSession.localNodeCatalog?.['dvt-sink-1']).toEqual(
      expect.objectContaining({
        id: 'dvt-sink-1',
        name: 'Analytics table 1',
        kind: 'dvt:sink',
        role: 'output',
        tags: ['authoring', 'target:analytics-table-replace'],
        metadata: expect.objectContaining({
          outputTargetTemplateId: 'analytics-table-replace',
          config: expect.objectContaining({
            schema: 'analytics',
            table: 'transformed_output',
            materialization: 'table',
            writeMode: 'replace',
          }),
        }),
      })
    );

    harness.cleanup();
  });

  it('creates source, model, transformation, test, and output nodes at explicit canvas positions', async () => {
    let currentNodes: Node[] = [];
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = nextNodes;
    });
    const setDraftSession = vi.fn();
    const initialDraftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession: initialDraftSession,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    const authoringRequests = [
      { kind: 'dvt:source', position: { x: 100, y: 80 } },
      { kind: 'dbt:model', position: { x: 320, y: 80 } },
      { kind: 'dvt:transform', position: { x: 540, y: 80 } },
      { kind: 'dbt:test', position: { x: 760, y: 80 } },
      { kind: 'dvt:sink', position: { x: 980, y: 80 } },
    ] as const;

    act(() => {
      for (const request of authoringRequests) {
        harness
          .latest()
          ?.handleCreateAuthoringNode(requireAuthoringNodeKind(request.kind), request.position);
      }
    });

    expect(currentNodes.map((node) => ({ id: node.id, position: node.position }))).toEqual([
      { id: 'dvt-source-1', position: { x: 100, y: 80 } },
      { id: 'dbt-model-1', position: { x: 320, y: 80 } },
      { id: 'dvt-transform-1', position: { x: 540, y: 80 } },
      { id: 'dbt-test-1', position: { x: 760, y: 80 } },
      { id: 'dvt-sink-1', position: { x: 980, y: 80 } },
    ]);
    expect(setDraftSession).toHaveBeenCalledTimes(authoringRequests.length);
    const latestDraftSession = applyDraftSessionUpdates(
      setDraftSession.mock.calls as [DraftSessionUpdate][],
      initialDraftSession
    );
    expect(latestDraftSession.workingSet.visibleNodeIds).toEqual([
      'dvt-source-1',
      'dbt-model-1',
      'dvt-transform-1',
      'dbt-test-1',
      'dvt-sink-1',
    ]);
    expect(Object.keys(latestDraftSession.localNodeCatalog ?? {})).toEqual([
      'dvt-source-1',
      'dbt-model-1',
      'dvt-transform-1',
      'dbt-test-1',
      'dvt-sink-1',
    ]);

    harness.cleanup();
  });

  it('serializes consecutive catalog-created nodes into one draft session before rerender', async () => {
    let currentNodes: Node[] = [];
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = nextNodes;
    });
    const setDraftSession = vi.fn();
    const initialDraftSession = {
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      draftSession: initialDraftSession,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:source'));
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:source'));
    });

    expect(setNodes).toHaveBeenCalledTimes(2);
    expect(currentNodes.map((node) => node.id)).toEqual(['dvt-source-1', 'dvt-source-2']);
    expect(setDraftSession).toHaveBeenCalledTimes(2);
    const latestDraftSession = applyDraftSessionUpdates(
      setDraftSession.mock.calls as [DraftSessionUpdate][],
      initialDraftSession
    );
    expect(latestDraftSession.workingSet.visibleNodeIds).toEqual(['dvt-source-1', 'dvt-source-2']);

    harness.cleanup();
  });

  it('rejects authoring node creation when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:source'));
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
