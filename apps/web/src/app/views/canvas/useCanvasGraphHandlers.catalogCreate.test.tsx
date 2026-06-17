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
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:sql_transform'));
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
      harness.latest()?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:sql_transform'));
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(typeof setNodes.mock.calls[0]?.[0]).not.toBe('function');
    expect(currentNodes).toEqual([
      expect.objectContaining({
        id: 'dvt-sql-transform-1',
        position: { x: 160, y: 120 },
        data: expect.objectContaining({
          name: 'SQL transform 1',
          pluginKind: 'dvt:sql_transform',
          role: 'transform',
        }),
      }),
    ]);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof nextDraftSession).not.toBe('function');
    expect(nextDraftSession.workingSet.visibleNodeIds).toContain('dvt-sql-transform-1');
    expect(nextDraftSession.localNodeCatalog?.['dvt-sql-transform-1']).toEqual(
      expect.objectContaining({
        id: 'dvt-sql-transform-1',
        kind: 'dvt:sql_transform',
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
        ?.handleCreateAuthoringNode(requireAuthoringNodeKind('dvt:sql_transform'), undefined, {
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

    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(nextDraftSession.localNodeCatalog?.['dvt-sql-transform-1']).toEqual(
      expect.objectContaining({
        id: 'dvt-sql-transform-1',
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

    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
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

  it('serializes consecutive catalog-created nodes into one draft session before rerender', async () => {
    let currentNodes: Node[] = [];
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = nextNodes;
    });
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
    const latestDraftSession = setDraftSession.mock.calls.at(-1)?.[0];
    expect(typeof latestDraftSession).not.toBe('function');
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
