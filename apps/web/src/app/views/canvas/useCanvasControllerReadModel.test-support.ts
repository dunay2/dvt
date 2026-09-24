import { createElement } from 'react';
import { vi } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type { CanonicalNode } from '../../types/canonical';
import { mapCanonicalNodeToCanvasNode } from './canvasNodeMapper';
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
export type ReadModelArgs = Parameters<typeof useCanvasControllerReadModel>[0];
type ReadModelState = ReturnType<typeof useCanvasControllerReadModel>;
export type ReadModelNodeData = Record<string, unknown>;
export const testNode = {
  id: 'source-orders',
  name: 'Orders Source',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
} satisfies CanonicalNode;
export function buildReadModelArgs(
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
      onEdgesChange: vi.fn(),
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
    cardActions: {
      onInspectNode: vi.fn(),
      onDuplicateNode: vi.fn(),
      onRemoveNode: vi.fn(),
      onAttachSchemaToNode: vi.fn(),
    },
    columnActions: {
      onColumnPortActivate: vi.fn(),
      onApplyCanvasColumnFunction: vi.fn(),
      onApplyCanvasStructuredField: vi.fn(),
      onAddCanvasCalculatedColumn: vi.fn(),
      onToggleCanvasColumnOutput: vi.fn(),
      onReorderCanvasColumnOutput: vi.fn(),
      onColumnDisclosureChange: vi.fn(),
      onAutomapColumns: vi.fn(),
    },
    compositionActions: {
      resolveAlgebraicCompositionOperations: vi.fn(() => []),
      onComposeCanvasNodes: vi.fn(),
    },
    activeColumnHandleId: null,
    onRemoveColumnMapping: vi.fn(),
    onToggleExecutionSelection: vi.fn(),
    canMutateGraph: false,
    canSelectExecution: true,
    columnLevelLineageEnabled: false,
    ...overrides,
  };
}
export async function renderReadModel(args: ReadModelArgs) {
  let observedState: ReadModelState | undefined;
  let currentArgs = args;
  function Probe() {
    observedState = useCanvasControllerReadModel(currentArgs);
    return null;
  }
  const mounted = await withTestQueryClient(createElement(Probe));
  return {
    readState: () => observedState,
    rerender: async (nextArgs: ReadModelArgs) => {
      currentArgs = nextArgs;
      await mounted.render(createElement(Probe));
    },
    cleanup: mounted.cleanup,
  };
}
export function readProjectedNodeData(
  state: ReadModelState | undefined
): ReadModelNodeData | undefined {
  return state?.nodesWithImpact[0]?.data as ReadModelNodeData | undefined;
}
