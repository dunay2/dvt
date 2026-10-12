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

describe('useCanvasGraphHandlers schema attachment', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('attaches a schema project resource to a visible node through the draft lifecycle', async () => {
    const modelNode = {
      ...buildCanonicalNode('model-orders', 'transform'),
      pluginId: 'dvt',
      kind: 'dvt:transform' as const,
      role: 'transform' as const,
      metadata: {
        config: {
          materialized: 'view',
        },
        dbt: {
          materialized: 'view',
          schemaName: 'raw',
        },
      },
    };
    const initialNodes: Node[] = [
      {
        id: 'model-orders',
        data: {
          name: 'Orders model',
          metadata: modelNode.metadata,
        },
        position: { x: 0, y: 0 },
      },
    ];
    let currentNodes: Node[] = initialNodes;
    const setNodes = vi.fn((nextNodes) => {
      currentNodes = typeof nextNodes === 'function' ? nextNodes(currentNodes) : nextNodes;
    });
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [modelNode],
      nodes: initialNodes,
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['model-orders'],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleAttachSchemaToNode('model-orders', 'mart');
    });

    expect(setNodes).toHaveBeenCalledTimes(1);
    expect(currentNodes[0]?.data.metadata).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          materialized: 'view',
          schema: 'mart',
        }),
        dbt: expect.objectContaining({
          materialized: 'view',
          schemaName: 'mart',
        }),
      })
    );
    expect(setDraftSession).toHaveBeenCalledTimes(1);
    const nextDraftSession = setDraftSession.mock.calls[0]?.[0];
    expect(nextDraftSession.localNodeCatalog?.['model-orders']?.metadata).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          materialized: 'view',
          schema: 'mart',
        }),
        dbt: expect.objectContaining({
          materialized: 'view',
          schemaName: 'mart',
        }),
      })
    );

    harness.cleanup();
  });

  it('updates the shared source schema without placing its definition or copying configuration', async () => {
    const source = buildCanonicalNode('source', 'input');
    const instances = ['first', 'second'].map((id) => ({
      ...source,
      id,
      sourceDefinitionId: source.id,
    }));
    const setDraftSession = vi.fn();
    const setNodes = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [source, ...instances],
      nodes: instances.map((node) => ({
        id: node.id,
        data: { name: node.name },
        position: { x: 0, y: 0 },
      })),
      draftSession: {
        ...buildDraftSession(),
        workingSet: {
          visibleNodeIds: ['first', 'second'],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      },
      setDraftSession,
      setNodes,
    });
    await harness.render();
    act(() => harness.latest()?.handleAttachSchemaToNode('first', 'mart'));
    const session = setDraftSession.mock.calls[0]?.[0];
    expect(session.workingSet.visibleNodeIds).toEqual(['first', 'second']);
    expect(Object.keys(session.localNodeCatalog)).toEqual(['source']);
    expect(session.localNodeCatalog.source.metadata.config.schema).toBe('mart');
    expect(setNodes.mock.calls[0]?.[0].map((node: Node) => node.data.metadata)).toEqual([
      session.localNodeCatalog.source.metadata,
      session.localNodeCatalog.source.metadata,
    ]);
    harness.cleanup();
  });

  it('rejects schema resource attachment when graph edits are gated', async () => {
    const setNodes = vi.fn();
    const setDraftSession = vi.fn();
    const harness = renderGraphHandlersHook({
      canEditEdges: false,
      setNodes,
      setDraftSession,
    });
    await harness.render();

    act(() => {
      harness.latest()?.handleAttachSchemaToNode('source-node', 'mart');
    });

    expect(toastState.error).toHaveBeenCalledWith(canvasViewCopy.mutationUnavailableMessage);
    expect(setNodes).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();

    harness.cleanup();
  });
});
