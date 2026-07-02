/** Owned concern: persist route-local Canvas interaction state and hydration readiness. */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type CanvasPosition = {
  x: number;
  y: number;
};

type CanvasViewportState = CanvasPosition & {
  zoom: number;
};

type WorkspaceCanvasLayout = {
  viewport: CanvasViewportState | null;
  nodePositions: Record<string, CanvasPosition>;
  frozenNodeIds?: string[];
};

const EMPTY_NODE_POSITIONS: Record<string, CanvasPosition> = {};

function buildWorkspaceCanvasLayout(args: {
  viewport: CanvasViewportState | null;
  nodePositions: Record<string, CanvasPosition>;
  frozenNodeIds?: string[];
}): WorkspaceCanvasLayout {
  const { viewport, nodePositions, frozenNodeIds } = args;
  return frozenNodeIds === undefined
    ? { viewport, nodePositions }
    : { viewport, nodePositions, frozenNodeIds };
}

function areCanvasNodePositionsEqual(
  left: Record<string, CanvasPosition>,
  right: Record<string, CanvasPosition>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([nodeId, position]) => {
    const nextPosition = right[nodeId];

    return nextPosition != null && position.x === nextPosition.x && position.y === nextPosition.y;
  });
}

function toggleFrozenNodeId(currentNodeIds: readonly string[], nodeId: string): string[] {
  return currentNodeIds.includes(nodeId)
    ? currentNodeIds.filter((currentNodeId) => currentNodeId !== nodeId)
    : [...currentNodeIds, nodeId].sort();
}

interface CanvasInteractionState {
  _hasHydrated: boolean;
  selectedNodes: string[];
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasLayouts: Record<string, WorkspaceCanvasLayout>;
  inspectorNodeId: string | null;
  inspectorPreferredTabId: string | null;
  inspectorPreferredTabRequestId: number;

  setSelectedNodes: (nodes: string[]) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  setCanvasViewport: (workspaceKey: string, viewport: CanvasViewportState | null) => void;
  setCanvasNodePositions: (workspaceKey: string, positions: Record<string, CanvasPosition>) => void;
  toggleFrozenCanvasNode: (workspaceKey: string, nodeId: string) => void;
  setInspectorNode: (nodeId: string | null, preferredTabId?: string | null) => void;
}

type CanvasInteractionPersistedState = Partial<
  Pick<
    CanvasInteractionState,
    'impactOverlayEnabled' | 'columnLevelLineageEnabled' | 'canvasLayouts'
  >
>;

export type { CanvasPosition, CanvasViewportState, WorkspaceCanvasLayout };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeCanvasInteractionPersistedState(
  persistedState: unknown,
  currentState: CanvasInteractionState
): CanvasInteractionState {
  const persisted = isRecord(persistedState)
    ? (persistedState as CanvasInteractionPersistedState)
    : {};

  return {
    ...currentState,
    impactOverlayEnabled:
      typeof persisted.impactOverlayEnabled === 'boolean'
        ? persisted.impactOverlayEnabled
        : currentState.impactOverlayEnabled,
    columnLevelLineageEnabled:
      typeof persisted.columnLevelLineageEnabled === 'boolean'
        ? persisted.columnLevelLineageEnabled
        : currentState.columnLevelLineageEnabled,
    canvasLayouts: isRecord(persisted.canvasLayouts)
      ? (persisted.canvasLayouts as Record<string, WorkspaceCanvasLayout>)
      : currentState.canvasLayouts,
    _hasHydrated: true,
  };
}

export const useCanvasInteractionStore = create<CanvasInteractionState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      selectedNodes: [],
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},
      inspectorNodeId: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,

      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      toggleImpactOverlay: () =>
        set((state) => ({ impactOverlayEnabled: !state.impactOverlayEnabled })),
      toggleColumnLevelLineage: () =>
        set((state) => ({ columnLevelLineageEnabled: !state.columnLevelLineageEnabled })),
      setCanvasViewport: (workspaceKey, viewport) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: buildWorkspaceCanvasLayout({
              viewport,
              nodePositions: state.canvasLayouts[workspaceKey]?.nodePositions ?? {},
              frozenNodeIds: state.canvasLayouts[workspaceKey]?.frozenNodeIds,
            }),
          },
        })),
      setCanvasNodePositions: (workspaceKey, positions) =>
        set((state) => {
          const currentLayout = state.canvasLayouts[workspaceKey];
          const currentPositions = currentLayout?.nodePositions ?? EMPTY_NODE_POSITIONS;

          if (areCanvasNodePositionsEqual(currentPositions, positions)) {
            return state;
          }

          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: buildWorkspaceCanvasLayout({
                viewport: currentLayout?.viewport ?? null,
                nodePositions: positions,
                frozenNodeIds: currentLayout?.frozenNodeIds,
              }),
            },
          };
        }),
      toggleFrozenCanvasNode: (workspaceKey, nodeId) =>
        set((state) => {
          const currentLayout = state.canvasLayouts[workspaceKey];
          const currentFrozenNodeIds = currentLayout?.frozenNodeIds ?? [];

          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: {
                viewport: currentLayout?.viewport ?? null,
                nodePositions: currentLayout?.nodePositions ?? EMPTY_NODE_POSITIONS,
                frozenNodeIds: toggleFrozenNodeId(currentFrozenNodeIds, nodeId),
              },
            },
          };
        }),
      setInspectorNode: (nodeId, preferredTabId = null) =>
        set((state) => ({
          inspectorNodeId: nodeId,
          inspectorPreferredTabId: nodeId == null ? null : preferredTabId,
          inspectorPreferredTabRequestId:
            nodeId != null && preferredTabId != null
              ? state.inspectorPreferredTabRequestId + 1
              : state.inspectorPreferredTabRequestId,
        })),
    }),
    {
      name: 'dvt-web-canvas-interaction',
      storage: createJSONStorage(() => localStorage),
      merge: mergeCanvasInteractionPersistedState,
      partialize: (state) => ({
        impactOverlayEnabled: state.impactOverlayEnabled,
        columnLevelLineageEnabled: state.columnLevelLineageEnabled,
        canvasLayouts: state.canvasLayouts,
      }),
    }
  )
);
