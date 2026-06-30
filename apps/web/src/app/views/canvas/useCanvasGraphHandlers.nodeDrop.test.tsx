// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Node } from '@xyflow/react';

import { canvasViewCopy } from './copy';
import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';
import { buildCanonicalDropEvent } from './useCanvasGraphHandlers.nodeAuthoring.test.support';

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

  it('applies a pure node admission transaction when dropping a canonical node', async () => {
    const initialNodes: Node[] = [
      { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
      { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
    ];
    let currentNodes: Node[] = initialNodes;
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = nextNodes;
    });
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: initialNodes,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness
        .latest()
        ?.handleDrop(buildCanonicalDropEvent(buildCanonicalNode('transform-node', 'transform')));
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(typeof setNodes.mock.calls[0]?.[0]).not.toBe('function');
    expect(currentNodes.map((node: { id: string }) => node.id)).toContain('transform-node');
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(typeof nextDraftSession).not.toBe('function');
    expect(nextDraftSession.workingSet.visibleNodeIds).toContain('transform-node');
    expect(nextDraftSession.localNodeCatalog?.['transform-node']).toEqual(
      expect.objectContaining({ id: 'transform-node' })
    );

    harness.cleanup();
  });

  it('serializes consecutive canonical drops into one draft session before rerender', async () => {
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
      harness.latest()?.handleDrop(
        buildCanonicalDropEvent({
          ...buildCanonicalNode('drop-source', 'input'),
          kind: 'dvt:source',
        })
      );
      harness.latest()?.handleDrop(
        buildCanonicalDropEvent({
          ...buildCanonicalNode('drop-transform', 'transform'),
          kind: 'dvt:sql_transform',
        })
      );
    });

    expect(setNodes).toHaveBeenCalledTimes(2);
    expect(currentNodes.map((node) => node.id)).toEqual(['drop-source', 'drop-transform']);
    expect(setDraftSession).toHaveBeenCalledTimes(2);
    const latestDraftSession = setDraftSession.mock.calls.at(-1)?.[0];
    expect(typeof latestDraftSession).not.toBe('function');
    expect(latestDraftSession.workingSet.visibleNodeIds).toEqual(['drop-source', 'drop-transform']);
    expect(latestDraftSession.localNodeCatalog?.['drop-source']).toEqual(
      expect.objectContaining({ id: 'drop-source' })
    );
    expect(latestDraftSession.localNodeCatalog?.['drop-transform']).toEqual(
      expect.objectContaining({ id: 'drop-transform' })
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

    const malformedPayload = JSON.stringify({
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
        getData: vi.fn(() => malformedPayload),
      },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('rejects canonical drop payloads outside the active runtime catalog', async () => {
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
      harness.latest()?.handleDrop(
        buildCanonicalDropEvent({
          ...buildCanonicalNode('transform-node', 'transform'),
          pluginId: 'dvt',
          kind: 'dvt:sql_transform',
        })
      );
    });

    expect(setNodes).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
    expect(toastState.info).toHaveBeenCalledWith(
      canvasViewCopy.nodeKindUnavailableForCanvasMessage
    );

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
