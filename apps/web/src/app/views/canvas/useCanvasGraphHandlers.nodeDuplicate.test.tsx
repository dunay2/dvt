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
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';

const SOURCE_NODE_ID = 'source-node';
const SINK_NODE_ID = 'sink-node';
const DUPLICATE_NODE_ID = 'source-node-copy-1';

type GraphHandlersHarness = ReturnType<typeof renderGraphHandlersHook>;
type DraftSessionUpdater = (existingSession: CanvasDraftSession) => CanvasDraftSession;
type DuplicateNodeHandler = { handleDuplicateNode?: (nodeId: string) => void };

describe('useCanvasGraphHandlers node duplicate', () => {
  beforeEach(() => {
    resetGraphHandlersTestDoubles();
  });

  afterEach(() => {
    restoreGraphHandlersTestDoubles();
  });

  it('duplicates a node into the same draft aggregate without copying edges', async () => {
    const scenario = renderNodeDuplicateScenario();
    await scenario.harness.render();

    try {
      duplicateNode(scenario.harness, SOURCE_NODE_ID);

      expect(scenario.setNodes).toHaveBeenCalledTimes(1);
      expect(Array.isArray(scenario.setNodes.mock.calls[0]?.[0])).toBe(true);
      expectDuplicateGraphNode(scenario.currentNodes(), scenario.canonicalSourceNode);
      expectDuplicateDraftSession(scenario.setDraftSession, scenario.canonicalSourceNode);
      expect(scenario.setSelectedNodes).toHaveBeenCalledWith([DUPLICATE_NODE_ID]);
      expect(scenario.setInspectorNode).toHaveBeenCalledWith(DUPLICATE_NODE_ID);
    } finally {
      scenario.harness.cleanup();
    }
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

function renderNodeDuplicateScenario(): {
  harness: GraphHandlersHarness;
  currentNodes: () => Node[];
  canonicalSourceNode: ReturnType<typeof buildCanonicalSourceNode>;
  setNodes: ReturnType<typeof vi.fn>;
  setDraftSession: ReturnType<typeof vi.fn>;
  setSelectedNodes: ReturnType<typeof vi.fn>;
  setInspectorNode: ReturnType<typeof vi.fn>;
} {
  const initialNodes = buildInitialNodes();
  const nodeState = createNodeState(initialNodes);
  const setDraftSession = vi.fn();
  const setSelectedNodes = vi.fn();
  const setInspectorNode = vi.fn();
  const canonicalSourceNode = buildCanonicalSourceNode();

  return {
    harness: renderGraphHandlersHook({
      canEditEdges: true,
      canonicalNodes: [canonicalSourceNode, buildCanonicalNode(SINK_NODE_ID, 'output')],
      nodes: initialNodes,
      edges: [{ id: 'edge_1', source: SOURCE_NODE_ID, target: SINK_NODE_ID }],
      draftSession: buildDuplicateDraftSession(),
      setNodes: nodeState.setNodes,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
    }),
    currentNodes: nodeState.currentNodes,
    canonicalSourceNode,
    setNodes: nodeState.setNodes,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
  };
}

function buildInitialNodes(): Node[] {
  return [
    {
      id: SOURCE_NODE_ID,
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
      position: { x: 64, y: 96 },
    },
    {
      id: SINK_NODE_ID,
      data: {
        name: 'Sink node',
        pluginKind: 'dvt:sink',
        role: 'output',
        status: 'idle',
      },
      position: { x: 300, y: 80 },
    },
  ];
}

function buildCanonicalSourceNode(): CanonicalNode {
  return {
    ...buildCanonicalNode(SOURCE_NODE_ID, 'input'),
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
}

function buildDuplicateDraftSession(): CanvasDraftSession {
  return {
    ...buildDraftSession(),
    workingSet: {
      visibleNodeIds: [SOURCE_NODE_ID, SINK_NODE_ID],
      visibleEdges: [{ sourceId: SOURCE_NODE_ID, targetId: SINK_NODE_ID }],
      pendingExplicitNodeIds: [],
    },
  };
}

function createNodeState(initialNodes: Node[]): {
  currentNodes: () => Node[];
  setNodes: ReturnType<typeof vi.fn>;
} {
  let currentNodes = initialNodes;
  const setNodes = vi.fn((nextNodes: Node[] | ((existingNodes: Node[]) => Node[])) => {
    currentNodes = typeof nextNodes === 'function' ? nextNodes(currentNodes) : nextNodes;
  });

  return {
    currentNodes: () => currentNodes,
    setNodes,
  };
}

function duplicateNode(harness: GraphHandlersHarness, nodeId: string): void {
  act(() => {
    (harness.latest() as unknown as DuplicateNodeHandler).handleDuplicateNode?.(nodeId);
  });
}

function expectDuplicateGraphNode(
  nodes: readonly Node[],
  canonicalSourceNode: ReturnType<typeof buildCanonicalSourceNode>
): void {
  expect(nodes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: DUPLICATE_NODE_ID,
        position: { x: 112, y: 144 },
        data: expect.objectContaining(expectedDuplicateGraphNodeData()),
      }),
    ])
  );

  const duplicatedGraphNode = findNodeWithMetadata(nodes, DUPLICATE_NODE_ID);
  expect(duplicatedGraphNode?.data?.metadata).not.toBe(canonicalSourceNode.metadata);
  expect(duplicatedGraphNode?.data?.metadata?.config).not.toBe(
    canonicalSourceNode.metadata?.config
  );
}

function expectDuplicateDraftSession(
  setDraftSession: ReturnType<typeof vi.fn>,
  canonicalSourceNode: ReturnType<typeof buildCanonicalSourceNode>
): void {
  expect(setDraftSession).toHaveBeenCalledTimes(1);
  const nextDraftSession = applyDraftSessionUpdate(setDraftSession);

  expect(nextDraftSession.workingSet.visibleNodeIds).toEqual([
    SOURCE_NODE_ID,
    SINK_NODE_ID,
    DUPLICATE_NODE_ID,
  ]);
  expect(nextDraftSession.workingSet.visibleEdges).toEqual([
    { sourceId: SOURCE_NODE_ID, targetId: SINK_NODE_ID },
  ]);
  expect(nextDraftSession.localNodeCatalog?.[DUPLICATE_NODE_ID]).toEqual(
    expect.objectContaining({
      id: DUPLICATE_NODE_ID,
      kind: 'dvt:source',
      ...expectedDuplicateCanonicalNodeData(),
    })
  );
  expect(nextDraftSession.localNodeCatalog?.[DUPLICATE_NODE_ID]?.metadata).not.toBe(
    canonicalSourceNode.metadata
  );
  expect(
    (nextDraftSession.localNodeCatalog?.[DUPLICATE_NODE_ID]?.metadata as
      | { config?: unknown }
      | undefined)?.config
  ).not.toBe(canonicalSourceNode.metadata?.config);
}

function applyDraftSessionUpdate(setDraftSession: ReturnType<typeof vi.fn>): CanvasDraftSession {
  const updateDraftSession = setDraftSession.mock.calls[0]?.[0] as DraftSessionUpdater;
  expect(updateDraftSession).toEqual(expect.any(Function));
  return updateDraftSession(buildDuplicateDraftSession());
}

function expectedDuplicateGraphNodeData(): Node['data'] {
  return {
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
  };
}

function expectedDuplicateCanonicalNodeData(): Partial<CanonicalNode> {
  return {
    name: 'Orders source (copy 1)',
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
  };
}

function findNodeWithMetadata(
  nodes: readonly Node[],
  nodeId: string
): { data?: { metadata?: { config?: unknown } } } | undefined {
  return nodes.find((node) => node.id === nodeId) as
    | { data?: { metadata?: { config?: unknown } } }
    | undefined;
}
