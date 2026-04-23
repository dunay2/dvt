// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasViewCopy } from './copy';
import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

function requireAuthoringNodeKind(kind: string): NodeKindRegistration {
  const registration = DVT_AUTHORING_NODE_KINDS.find((candidate) => candidate.kind === kind);
  if (registration == null) {
    throw new Error(`Missing authoring node kind fixture: ${kind}`);
  }
  return registration;
}

describe('useCanvasGraphHandlers node drop', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('rejects node drops when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
    });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: vi.fn(() => ''),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('uses a functional node updater when dropping a canonical node', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    const payload = JSON.stringify(buildCanonicalNode('transform-node', 'transform'));
    const dragEvent = {
      preventDefault: vi.fn(),
      target: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      clientX: 120,
      clientY: 80,
      dataTransfer: {
        getData: vi.fn(() => payload),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    const nextNodes = nodeUpdater([
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ]);
    expect(nextNodes.map((node: { id: string }) => node.id)).toContain('transform-node');
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0](buildDraftSession());
    expect(nextDraftSession.workingSet.visibleNodeIds).toContain('transform-node');
    expect(nextDraftSession.localNodeCatalog?.['transform-node']).toEqual(
      expect.objectContaining({ id: 'transform-node' })
    );

    harness.cleanup();
  });

  it('ignores malformed canonical drop payloads instead of coercing them into canonical nodes', async () => {
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      setNodes,
    });
    await harness.render();

    const payload = JSON.stringify({
      ...buildCanonicalNode('transform-node', 'transform'),
      kind: 'malformed-kind',
    });
    const dragEvent = {
      preventDefault: vi.fn(),
      target: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      },
      clientX: 120,
      clientY: 80,
      dataTransfer: {
        getData: vi.fn(() => payload),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('creates an authoring node from the governed node catalog through the draft lifecycle', async () => {
    const setNodes = vi.fn();
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
      harness.latest()?.handleCreateAuthoringNode(
        requireAuthoringNodeKind('dvt:sql_transform')
      );
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    const nextNodes = nodeUpdater([]);
    expect(nextNodes).toEqual([
      expect.objectContaining({
        id: 'dvt-sql-transform-1',
        position: { x: 0, y: 0 },
        data: expect.objectContaining({
          name: 'SQL transform 1',
          pluginKind: 'dvt:sql_transform',
          role: 'transform',
        }),
      }),
    ]);
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0]({
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: [],
        visibleEdges: [],
        pendingExplicitNodeIds: [],
      },
    });
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

  it('marks drag-over events as movable drop targets', async () => {
    const harness = renderGraphHandlersHook({ canEditEdges: true });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: {
        dropEffect: 'copy',
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDragOver(dragEvent);
    });

    expect(dragEvent.preventDefault).toHaveBeenCalled();
    expect(dragEvent.dataTransfer.dropEffect).toBe('move');

    harness.cleanup();
  });
});
