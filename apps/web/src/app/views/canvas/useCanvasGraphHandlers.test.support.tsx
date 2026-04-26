import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';
import { vi } from 'vitest';

import type { Edge, Node } from '@xyflow/react';

import type { ConnectionRuleResult } from '../../plugins/contracts/ConnectionRules';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { TransformationConnectionGuardReasonCode } from './transformationConnectionGuard';
import { useCanvasGraphHandlers } from './useCanvasGraphHandlers';

const graphHandlersTestDoubles = vi.hoisted(() => ({
  evaluateConnection: vi.fn<() => ConnectionRuleResult>(() => ({ allowed: true })),
  guardTransformationConnection: vi.fn<
    () =>
      | { allowed: true }
      | {
          allowed: false;
          reasonCode: TransformationConnectionGuardReasonCode;
        }
  >(() => ({ allowed: true })),
}));

vi.mock('../../plugins/contracts/ConnectionRules', () => ({
  evaluateConnection: graphHandlersTestDoubles.evaluateConnection,
}));

vi.mock('../../plugins/nodeTypeRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../plugins/nodeTypeRegistry')>();
  return {
    ...actual,
    resolveCanvasEdgeType: () => 'lineage',
  };
});

vi.mock('./transformationConnectionGuard', () => ({
  guardTransformationConnection: graphHandlersTestDoubles.guardTransformationConnection,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

export const toastState = toast as unknown as {
  error: ReturnType<typeof vi.fn>;
  success: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
};

type LatestHook = ReturnType<typeof useCanvasGraphHandlers> | null;

export function buildCanonicalNode(id: string, role: CanonicalNode['role']): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: role === 'input' ? 'dvt:source' : 'dvt:sink',
    role,
    status: 'idle',
    tags: [],
  };
}

export function buildDraftSession(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: {
      record: null,
    },
    draftRevision: 'rev-1',
    workingSet: {
      visibleNodeIds: ['source-node', 'sink-node'],
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
  };
}

type RenderGraphHandlersHookArgs = {
  canEditEdges: boolean;
  allowsCanonicalNode?: (node: CanonicalNode) => boolean;
  graphStrategy?: {
    parseDropPayload: (dataTransfer: DataTransfer) => CanonicalNode | null;
  };
  canonicalNodes?: CanonicalNode[];
  nodes?: Node[];
  edges?: Edge[];
  draftSession?: CanvasDraftSession;
  selectedNodeIds?: string[];
  inspectorNodeId?: string | null;
  focusMode?: boolean;
  inspectorPanelVisible?: boolean;
  columnLevelLineageEnabled?: boolean;
  setNodes?: ReturnType<typeof vi.fn>;
  setEdges?: ReturnType<typeof vi.fn>;
  setDraftSession?: ReturnType<typeof vi.fn>;
  setSelectedNodes?: ReturnType<typeof vi.fn>;
  setInspectorNode?: ReturnType<typeof vi.fn>;
  toggleInspectorPanel?: ReturnType<typeof vi.fn>;
  onLayoutComplete?: ReturnType<typeof vi.fn>;
};

export function renderGraphHandlersHook({
  canEditEdges,
  allowsCanonicalNode = () => true,
  graphStrategy,
  canonicalNodes = [buildCanonicalNode('source-node', 'input'), buildCanonicalNode('sink-node', 'output')],
  nodes = [
    { id: 'source-node', data: { name: 'source-node' }, position: { x: 0, y: 0 } },
    { id: 'sink-node', data: { name: 'sink-node' }, position: { x: 1, y: 1 } },
  ],
  edges = [],
  draftSession = buildDraftSession(),
  selectedNodeIds = [],
  inspectorNodeId = null,
  focusMode = false,
  inspectorPanelVisible = true,
  columnLevelLineageEnabled = false,
  setNodes = vi.fn(),
  setEdges = vi.fn(),
  setDraftSession = vi.fn(),
  setSelectedNodes = vi.fn(),
  setInspectorNode = vi.fn(),
  toggleInspectorPanel = vi.fn(),
  onLayoutComplete = vi.fn(),
}: RenderGraphHandlersHookArgs): {
  latest: () => LatestHook;
  render: () => Promise<void>;
  cleanup: () => void;
  setNodes: ReturnType<typeof vi.fn>;
  setEdges: ReturnType<typeof vi.fn>;
  setDraftSession: ReturnType<typeof vi.fn>;
  setSelectedNodes: ReturnType<typeof vi.fn>;
  setInspectorNode: ReturnType<typeof vi.fn>;
  toggleInspectorPanel: ReturnType<typeof vi.fn>;
  onLayoutComplete: ReturnType<typeof vi.fn>;
} {
  const canonicalNodesById = new Map(canonicalNodes.map((node) => [node.id, node]));
  let latest: LatestHook = null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function HookHost(): null {
    latest = useCanvasGraphHandlers({
      graphStrategy: {
        id: 'transformation',
        mapNodeToCanonical: () => null,
        mapEdgeToCanonical: () => null,
        parseDropPayload: graphStrategy?.parseDropPayload ?? (() => null),
      },
      canonicalNodesById,
      edges,
      nodes,
      selectedNodeIds,
      inspectorNodeId,
      draftSession,
      canEditEdges,
      allowsCanonicalNode,
      focusMode,
      inspectorPanelVisible,
      columnLevelLineageEnabled,
      setNodes,
      setEdges,
      setDraftSession,
      setSelectedNodes,
      setInspectorNode,
      toggleInspectorPanel,
      onLayoutComplete,
    });
    return null;
  }

  return {
    latest: () => latest,
    render: async () => {
      await act(async () => {
        root.render(<HookHost />);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
    setNodes,
    setEdges,
    setDraftSession,
    setSelectedNodes,
    setInspectorNode,
    toggleInspectorPanel,
    onLayoutComplete,
  };
}

export function resetGraphHandlersTestDoubles() {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  graphHandlersTestDoubles.evaluateConnection.mockReset();
  graphHandlersTestDoubles.evaluateConnection.mockReturnValue({ allowed: true });
  graphHandlersTestDoubles.guardTransformationConnection.mockReset();
  graphHandlersTestDoubles.guardTransformationConnection.mockReturnValue({ allowed: true });
  toastState.error.mockReset();
  toastState.success.mockReset();
  toastState.info.mockReset();
}

export function restoreGraphHandlersTestDoubles() {
  vi.clearAllMocks();
  vi.useRealTimers();
}

export function rejectGraphHandlerConnectionWith(
  rejection: Exclude<ConnectionRuleResult, { allowed: true }>
) {
  graphHandlersTestDoubles.evaluateConnection.mockReturnValue(rejection);
}

export function rejectTransformationConnectionWith(reasonCode: TransformationConnectionGuardReasonCode) {
  graphHandlersTestDoubles.guardTransformationConnection.mockReturnValue({
    allowed: false,
    reasonCode,
  });
}
