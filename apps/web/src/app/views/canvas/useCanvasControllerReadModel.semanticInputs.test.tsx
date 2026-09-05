// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';

const { projectionCalls } = vi.hoisted(() => ({
  projectionCalls: [] as Array<{
    nodes: readonly unknown[];
    edges: readonly unknown[];
  }>,
}));

vi.mock('./canvasColumnFunctionMenuProjection', async () => {
  const actual = await vi.importActual<typeof import('./canvasColumnFunctionMenuProjection')>(
    './canvasColumnFunctionMenuProjection'
  );

  return {
    ...actual,
    projectCanvasColumnFunctionMenus: (
      args: Parameters<typeof actual.projectCanvasColumnFunctionMenus>[0]
    ) => {
      projectionCalls.push({ nodes: args.nodes, edges: args.edges });
      return actual.projectCanvasColumnFunctionMenus(args);
    },
  };
});

import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';

type ReadModelArgs = Parameters<typeof useCanvasControllerReadModel>[0];
type ReadModelState = ReturnType<typeof useCanvasControllerReadModel>;

let previousActEnvironment: boolean | undefined;

function buildCanonicalNode(id: string): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

function buildArgs(): ReadModelArgs {
  const canonicalNodes = [buildCanonicalNode('source-a'), buildCanonicalNode('source-b')];
  const canonicalNodesById = new Map(canonicalNodes.map((node) => [node.id, node]));
  const edges = [{ id: 'source-a-source-b', source: 'source-a', target: 'source-b' }];
  const canonicalEdges = [
    {
      id: 'source-a-source-b',
      sourceId: 'source-a',
      targetId: 'source-b',
      relation: 'lineage' as const,
    },
  ];

  return {
    graphModel: {
      nodes: canonicalNodes.map((node, index) =>
        mapCanonicalNodeToCanvasNode({ canonicalNode: node, index, showColumns: false })
      ),
      edges,
      canonicalNodesById,
      onEdgesChange: vi.fn(),
    },
    visibleScope: {
      canonicalNodes,
      canonicalEdges,
    },
    executionScope: {
      selectedNodeIds: [],
      workspaceNodeIds: canonicalNodes.map((node) => node.id),
    },
    uiScope: {
      selectedNodeIds: [],
      inspectorNodeId: null,
    },
    overlayModel: {
      activeRunId: null,
      overlayDecorations: new Map(),
      runStatusByNodeId: new Map(),
    },
    graphHandlers: {
      handleInspectNode: vi.fn(),
      handleDuplicateNode: vi.fn(),
      handleRemoveNode: vi.fn(),
      handleToggleNodeSelection: vi.fn(),
      handleAttachSchemaToNode: vi.fn(),
      activeColumnHandleId: null,
      handleColumnPortActivate: vi.fn(),
      handleApplyCanvasColumnFunction: vi.fn(),
      handleApplyCanvasStructuredField: vi.fn(),
      handleAddCanvasCalculatedColumn: vi.fn(),
      handleToggleCanvasColumnOutput: vi.fn(),
      handleReorderCanvasColumnOutput: vi.fn(),
      handleColumnDisclosureChange: vi.fn(),
      handleAutomapCanvasColumns: vi.fn(),
      handleRemoveColumnMapping: vi.fn(),
      resolveCanvasAlgebraicCompositionOperations: vi.fn(() => []),
      handleComposeCanvasNodes: vi.fn(),
    },
    onToggleExecutionSelection: vi.fn(),
    canMutateGraph: true,
    canSelectExecution: true,
    columnLevelLineageEnabled: false,
  };
}

async function renderReadModel(args: ReadModelArgs): Promise<{
  readState: () => ReadModelState | undefined;
  rerender: (nextArgs: ReadModelArgs) => Promise<void>;
  cleanup: () => Promise<void>;
}> {
  let currentArgs = args;
  let observedState: ReadModelState | undefined;
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  function Probe(): null {
    observedState = useCanvasControllerReadModel(currentArgs);
    return null;
  }

  await act(async () => {
    root.render(createElement(Probe));
  });

  return {
    readState: () => observedState,
    rerender: async (nextArgs) => {
      currentArgs = nextArgs;
      await act(async () => {
        root.render(createElement(Probe));
      });
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  projectionCalls.length = 0;
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
  globalObject.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  projectionCalls.length = 0;
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  if (previousActEnvironment === undefined) {
    Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
  } else {
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
  vi.clearAllMocks();
});

describe('useCanvasControllerReadModel shared semantic inputs', () => {
  it('reuses one canonical-node list and one edge projection across cards and geometry-only rerenders', async () => {
    const args = buildArgs();
    const mounted = await renderReadModel(args);

    try {
      expect(projectionCalls).toHaveLength(2);
      const initialNodes = projectionCalls[0]?.nodes;
      const initialEdges = projectionCalls[0]?.edges;

      expect(projectionCalls[1]?.nodes).toBe(initialNodes);
      expect(projectionCalls[1]?.edges).toBe(initialEdges);
      expect(initialNodes).toHaveLength(2);
      expect(initialEdges).toEqual([{ sourceId: 'source-a', targetId: 'source-b' }]);

      projectionCalls.length = 0;
      const movedNodes = args.graphModel.nodes.map((node) =>
        node.id === 'source-a'
          ? { ...node, position: { x: node.position.x + 120, y: node.position.y + 40 }, dragging: true }
          : node
      );

      await mounted.rerender({
        ...args,
        graphModel: {
          ...args.graphModel,
          nodes: movedNodes,
        },
      });

      expect(mounted.readState()?.nodesWithImpact[0]?.position).toEqual(movedNodes[0]?.position);
      expect(projectionCalls).toHaveLength(2);
      expect(projectionCalls[0]?.nodes).toBe(initialNodes);
      expect(projectionCalls[1]?.nodes).toBe(initialNodes);
      expect(projectionCalls[0]?.edges).toBe(initialEdges);
      expect(projectionCalls[1]?.edges).toBe(initialEdges);
    } finally {
      await mounted.cleanup();
    }
  });
});
