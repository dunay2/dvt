// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';

type ReadModelArgs = Parameters<typeof useCanvasControllerReadModel>[0];
type ReadModelState = ReturnType<typeof useCanvasControllerReadModel>;
type ReadModelNodeData = {
  onDuplicateNode?: unknown;
  onRemoveNode?: unknown;
  onAttachSchemaToNode?: unknown;
  onToggleNodeSelection?: unknown;
};

const testNode = {
  id: 'source-orders',
  name: 'Orders Source',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;

let previousActEnvironment: boolean | undefined;

beforeEach(() => {
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
  globalObject.IS_REACT_ACT_ENVIRONMENT = true;
});

function buildReadModelArgs(
  overrides?: Partial<Pick<ReadModelArgs, 'canMutateGraph' | 'canSelectExecution'>>
): ReadModelArgs {
  const graphNode = mapCanonicalNodeToCanvasNode({
    canonicalNode: testNode,
    index: 0,
    showColumns: false,
  });

  return {
    graphModel: {
      nodes: [graphNode],
      edges: [],
      canonicalNodesById: new Map([[testNode.id, testNode]]),
    },
    visibleScope: {
      canonicalNodes: [testNode],
      canonicalEdges: [],
    },
    executionScope: {
      selectedNodeIds: [],
      workspaceNodeIds: [testNode.id],
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
    },
    canMutateGraph: false,
    canSelectExecution: true,
    columnLevelLineageEnabled: false,
    impactOverlayEnabled: false,
    ...overrides,
  };
}

async function renderReadModel(args: ReadModelArgs): Promise<{
  readState: () => ReadModelState | undefined;
  cleanup: () => Promise<void>;
}> {
  let observedState: ReadModelState | undefined;

  function ReadModelProbe(): null {
    observedState = useCanvasControllerReadModel(args);
    return null;
  }

  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  await act(async () => {
    root.render(createElement(ReadModelProbe));
  });

  return {
    readState: () => observedState,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function readProjectedNodeData(state: ReadModelState | undefined): ReadModelNodeData | undefined {
  return state?.nodesWithImpact[0]?.data as ReadModelNodeData | undefined;
}

afterEach(() => {
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

describe('useCanvasControllerReadModel', () => {
  it('keeps execution selection handlers when graph mutation is blocked', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: false,
      canSelectExecution: true,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onDuplicateNode).toBeUndefined();
      expect(nodeData?.onRemoveNode).toBeUndefined();
      expect(nodeData?.onAttachSchemaToNode).toBeUndefined();
      expect(nodeData?.onToggleNodeSelection).toBe(args.graphHandlers.handleToggleNodeSelection);
    } finally {
      await mounted.cleanup();
    }
  });

  it('removes execution selection handlers when planning and running are blocked', async () => {
    const args = buildReadModelArgs({
      canMutateGraph: false,
      canSelectExecution: false,
    });
    const mounted = await renderReadModel(args);

    try {
      const nodeData = readProjectedNodeData(mounted.readState());

      expect(nodeData?.onToggleNodeSelection).toBeUndefined();
    } finally {
      await mounted.cleanup();
    }
  });
});
