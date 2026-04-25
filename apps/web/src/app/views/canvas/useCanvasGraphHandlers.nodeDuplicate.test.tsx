// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canvasViewCopy } from './copy';
import {
  buildCanonicalNode,
  buildDraftSession,
  renderGraphHandlersHook,
  resetGraphHandlersTestDoubles,
  restoreGraphHandlersTestDoubles,
  toastState,
} from './useCanvasGraphHandlers.test.support';

describe('useCanvasGraphHandlers node duplicate', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('duplicates a node into the same draft aggregate without copying edges', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const setSelectedNodes = vi.fn();
    const setInspectorNode = vi.fn();
    const canonicalSourceNode = {
      ...buildCanonicalNode('source-node', 'input'),
      name: 'Orders source',
      description: 'Primary source node',
      path: 'models/orders.sql',
      tags: ['authoring', 'critical'],
      metadata: {
        config: {
          schema: 'raw',
          table: 'orders',
        },
      },
      status: 'success' as const,
      lastDuration: 320,
      lastCost: 18,
    };
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [canonicalSourceNode, buildCanonicalNode('sink-node', 'output')],
      nodes: [
        {
          id: 'source-node',
          data: {
            name: 'Orders source',
            pluginKind: 'dvt:source',
            role: 'input',
            status: 'success',
            description: 'Primary source node',
            path: 'models/orders.sql',
            tags: ['authoring', 'critical'],
            metadata: {
              config: {
                schema: 'raw',
                table: 'orders',
              },
            },
          },
          position: { x: 40, y: 80 },
        },
        {
          id: 'sink-node',
          data: {
            name: 'Sink node',
            pluginKind: 'dvt:sink',
            role: 'output',
            status: 'idle',
          },
          position: { x: 300, y: 80 },
        },
      ],
      edges: [{ id: 'edge_1', source: 'source-node', target: 'sink-node' }],
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['source-node', 'sink-node'],
          visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
          pendingExplicitNodeIds: [],
        },
      },
      setNodes,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
    });
    await harness.render();

    act(() => {
      (harness.latest() as unknown as { handleDuplicateNode?: (nodeId: string) => void })
        .handleDuplicateNode?.('source-node');
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    const nodeUpdater = setNodes.mock.calls[0]?.[0];
    expect(typeof nodeUpdater).toBe('function');
    const nextNodes = nodeUpdater([
      {
        id: 'source-node',
        data: {
          name: 'Orders source',
          pluginKind: 'dvt:source',
          role: 'input',
          status: 'success',
          description: 'Primary source node',
          path: 'models/orders.sql',
          tags: ['authoring', 'critical'],
          metadata: {
            config: {
              schema: 'raw',
              table: 'orders',
            },
          },
        },
        position: { x: 40, y: 80 },
      },
      {
        id: 'sink-node',
        data: {
          name: 'Sink node',
          pluginKind: 'dvt:sink',
          role: 'output',
          status: 'idle',
        },
        position: { x: 300, y: 80 },
      },
    ]);
    expect(nextNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'source-node-copy-1',
          position: { x: 88, y: 128 },
          data: expect.objectContaining({
            name: 'Orders source (copy 1)',
            pluginKind: 'dvt:source',
            role: 'input',
            status: 'idle',
            description: 'Primary source node',
            path: 'models/orders.sql',
            tags: ['authoring', 'critical'],
            metadata: {
              config: {
                schema: 'raw',
                table: 'orders',
              },
            },
          }),
        }),
      ])
    );
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0]({
      ...buildDraftSession(),
      workingSet: {
        visibleNodeIds: ['source-node', 'sink-node'],
        visibleEdges: [{ sourceId: 'source-node', targetId: 'sink-node' }],
        pendingExplicitNodeIds: [],
      },
    });
    expect(nextDraftSession.workingSet.visibleNodeIds).toEqual([
      'source-node',
      'sink-node',
      'source-node-copy-1',
    ]);
    expect(nextDraftSession.workingSet.visibleEdges).toEqual([
      { sourceId: 'source-node', targetId: 'sink-node' },
    ]);
    expect(nextDraftSession.localNodeCatalog?.['source-node-copy-1']).toEqual(
      expect.objectContaining({
        id: 'source-node-copy-1',
        name: 'Orders source (copy 1)',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        description: 'Primary source node',
        path: 'models/orders.sql',
        tags: ['authoring', 'critical'],
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
          },
        },
      })
    );
    expect(setSelectedNodes).toHaveBeenCalledWith(['source-node-copy-1']);
    expect(setInspectorNode).toHaveBeenCalledWith('source-node-copy-1');

    harness.cleanup();
  });

  it('rejects node duplicate when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
    });
    await harness.render();

    act(() => {
      (harness.latest() as unknown as { handleDuplicateNode?: (nodeId: string) => void })
        .handleDuplicateNode?.('source-node');
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setNodes).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
