// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Node } from '@xyflow/react';

import { canvasViewCopy } from './copy';
import { applyStateUpdater } from './canvasCreateCanvasDocumentCommand.test.support';
import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';
import { buildCanonicalDropEvent } from './useCanvasGraphHandlers.nodeAuthoring.test.support';
import { CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE } from './canvasNodeDropPayload';

describe('useCanvasGraphHandlers node drop', () => {
  it('creates distinct instances for consecutive drops without re-registering the source', async () => {
    const source = buildCanonicalNode('registered', 'input');
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      nodes: [],
      canonicalNodes: [source],
      setNodes,
      setDraftSession,
    });
    await harness.render();
    const event = buildCanonicalDropEvent(source);
    Object.assign(event.dataTransfer, {
      types: [CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE],
      getData: (type: string) => (type === CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE ? source.id : ''),
    });
    act(() => {
      harness.latest()?.handleDrop(event);
      harness.latest()?.handleDrop(event);
    });
    const placed = setNodes.mock.calls[1]?.[0] as Node[];
    expect(placed).toHaveLength(2);
    expect(new Set(placed.map((n) => n.id)).size).toBe(2);
    expect(placed.every((n) => n.id !== source.id)).toBe(true);
    expect(placed.map((n) => n.data.name)).toEqual(['registered', 'registered 2']);
    expect(setDraftSession).toHaveBeenCalledTimes(2);
    harness.cleanup();
  });
  it.each([true, false])(
    'resolves dropped catalogue identity only within the current graph (known=%s)',
    async (known) => {
      const source = {
        ...buildCanonicalNode('registered', 'input'),
        name: 'Current configuration',
      };
      const setNodes = vi.fn();
      const setDraftSession = vi.fn();
      const harness = renderGraphHandlersHook({
        canEditEdges: true,
        nodes: [],
        canonicalNodes: known ? [source] : [],
        setNodes,
        setDraftSession,
      });
      await harness.render();
      const event = buildCanonicalDropEvent(source);
      Object.assign(event.dataTransfer, {
        types: [CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE],
        getData: (type: string) => (type === CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE ? source.id : ''),
      });
      act(() => {
        harness.latest()?.handleDrop(event);
      });
      if (known) {
        expect(setNodes).toHaveBeenCalledTimes(1);
        expect(setNodes.mock.calls[0]?.[0][0]?.data.name).toBe('Current configuration');
        expect(setDraftSession).toHaveBeenCalledTimes(1);
      } else {
        expect(setNodes).not.toHaveBeenCalled();
        expect(setDraftSession).not.toHaveBeenCalled();
        expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.nodeDropPayloadInvalidMessage);
      }
      harness.cleanup();
    }
  );

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

  it('fails closed before admission when the active plugin drop parser throws', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      graphStrategy: {
        parseDropPayload: () => {
          throw new Error('drop parser failed');
        },
      },
      setNodes,
      setDraftSession,
    });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { getData: vi.fn(() => '') },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.nodeDropPayloadInvalidMessage);
    expect(setNodes).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });

  it('keeps a normal null plugin drop result as a silent no-op', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      graphStrategy: { parseDropPayload: () => null },
      setNodes,
      setDraftSession,
    });
    await harness.render();

    const dragEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { getData: vi.fn(() => '') },
    } as unknown as React.DragEvent<HTMLDivElement>;

    act(() => {
      harness.latest()?.handleDrop(dragEvent);
    });

    expect(toastState.error).not.toHaveBeenCalled();
    expect(setNodes).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();

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
    const nextDraftSession = applyStateUpdater(
      setDraftSession.mock.calls[0]?.[0],
      buildDraftSession()
    );
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
          kind: 'dvt:transform',
        })
      );
    });

    expect(setNodes).toHaveBeenCalledTimes(2);
    expect(currentNodes.map((node) => node.id)).toEqual(['drop-source', 'drop-transform']);
    expect(setDraftSession).toHaveBeenCalledTimes(2);
    const latestDraftSession = setDraftSession.mock.calls.reduce(
      (currentDraftSession, [updater]) => applyStateUpdater(updater, currentDraftSession),
      draftSession
    );
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
          kind: 'dvt:transform',
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

  it.each([
    { canEditEdges: true, types: [], effect: 'move' },
    { canEditEdges: true, types: [CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE], effect: 'copy' },
    { canEditEdges: false, types: [CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE], effect: 'none' },
  ])(
    'marks drag-over as $effect for the admitted payload',
    async ({ canEditEdges, types, effect }) => {
      const harness = renderGraphHandlersHook({ canEditEdges });
      await harness.render();

      const dragEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          types,
          dropEffect: 'copy',
        },
      } as unknown as React.DragEvent<HTMLDivElement>;

      act(() => {
        harness.latest()?.handleDragOver(dragEvent);
      });

      expect(dragEvent.preventDefault).toHaveBeenCalled();
      expect(dragEvent.dataTransfer.dropEffect).toBe(effect);

      harness.cleanup();
    }
  );
});
