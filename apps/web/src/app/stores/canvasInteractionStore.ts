/** Owned concern: persist route-local Canvas interaction state and hydration readiness. */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isRecord } from '../types/canonicalGuards';

import {
  createCanvasExecutionSelectionIntent,
  type CanvasExecutionSelectionIntent,
} from '../types/canvasExecutionSelection';

type CanvasPosition = {
  x: number;
  y: number;
};

type CanvasViewportState = CanvasPosition & {
  zoom: number;
};

export type CanvasResourceInstance = Readonly<{ id: string; resourceId: string }>;

export type CanvasContextualWorkbenchId = 'project-code';
export type CanvasInspectorListId = 'columns' | 'outputs';

type CanvasInspectorListOrders = Partial<Record<CanvasInspectorListId, string[]>>;

type WorkspaceCanvasLayout = {
  viewport: CanvasViewportState | null;
  nodePositions: Record<string, CanvasPosition>;
  frozenNodeIds?: string[];
  inspectorListOrdersByNode?: Record<string, CanvasInspectorListOrders>;
  resourceInstances?: CanvasResourceInstance[];
};

const EMPTY_NODE_POSITIONS: Record<string, CanvasPosition> = {};

function buildWorkspaceCanvasLayout(
  current: WorkspaceCanvasLayout | undefined,
  patch: Partial<WorkspaceCanvasLayout>
): WorkspaceCanvasLayout {
  return { viewport: null, nodePositions: EMPTY_NODE_POSITIONS, ...current, ...patch };
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

function areOrderedIdsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function toggleFrozenNodeId(currentNodeIds: readonly string[], nodeId: string): string[] {
  return currentNodeIds.includes(nodeId)
    ? currentNodeIds.filter((currentNodeId) => currentNodeId !== nodeId)
    : [...currentNodeIds, nodeId].sort();
}

interface CanvasInteractionState {
  _hasHydrated: boolean;
  executionSelectionIntent: CanvasExecutionSelectionIntent;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasLayouts: Record<string, WorkspaceCanvasLayout>;
  inspectorNodeId: string | null;
  inspectorPreferredTabId: string | null;
  inspectorPreferredTabRequestId: number;
  contextualWorkbenchId: CanvasContextualWorkbenchId | null;
  contextualWorkbenchOwnerKey: string | null;

  setSelectedNodes: (nodes: string[]) => void;
  setExecutionSelectionIntent: (intent: CanvasExecutionSelectionIntent) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  setCanvasViewport: (workspaceKey: string, viewport: CanvasViewportState | null) => void;
  setCanvasNodePositions: (workspaceKey: string, positions: Record<string, CanvasPosition>) => void;
  placeCanvasResourceInstance: (
    workspaceKey: string,
    instance: CanvasResourceInstance,
    position: CanvasPosition
  ) => void;
  removeCanvasResourceInstance: (workspaceKey: string, instanceId: string) => void;
  toggleFrozenCanvasNode: (workspaceKey: string, nodeId: string) => void;
  setCanvasInspectorListOrder: (
    workspaceKey: string,
    nodeId: string,
    listId: CanvasInspectorListId,
    orderedIds: string[]
  ) => void;
  setInspectorNode: (nodeId: string | null, preferredTabId?: string | null) => void;
  openContextualWorkbench: (workbenchId: CanvasContextualWorkbenchId, ownerKey: string) => void;
  closeContextualWorkbench: () => void;
}

type CanvasInteractionPersistedState = Partial<
  Pick<
    CanvasInteractionState,
    'impactOverlayEnabled' | 'columnLevelLineageEnabled' | 'canvasLayouts'
  >
>;

export type { CanvasPosition, CanvasViewportState, WorkspaceCanvasLayout };

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
      executionSelectionIntent: createCanvasExecutionSelectionIntent([]),
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},
      inspectorNodeId: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
      contextualWorkbenchId: null,
      contextualWorkbenchOwnerKey: null,

      setSelectedNodes: (nodes) =>
        set((state) => {
          const executionSelectionIntent = createCanvasExecutionSelectionIntent(nodes);

          return areOrderedIdsEqual(
            state.executionSelectionIntent.nodeIds,
            executionSelectionIntent.nodeIds
          ) && state.executionSelectionIntent.mode === executionSelectionIntent.mode
            ? state
            : { executionSelectionIntent };
        }),
      setExecutionSelectionIntent: (intent) =>
        set((state) => {
          const executionSelectionIntent = createCanvasExecutionSelectionIntent(
            intent.nodeIds,
            intent.mode
          );

          return areOrderedIdsEqual(
            state.executionSelectionIntent.nodeIds,
            executionSelectionIntent.nodeIds
          ) && state.executionSelectionIntent.mode === executionSelectionIntent.mode
            ? state
            : { executionSelectionIntent };
        }),
      toggleImpactOverlay: () =>
        set((state) => ({ impactOverlayEnabled: !state.impactOverlayEnabled })),
      toggleColumnLevelLineage: () =>
        set((state) => ({ columnLevelLineageEnabled: !state.columnLevelLineageEnabled })),
      setCanvasViewport: (workspaceKey, viewport) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: buildWorkspaceCanvasLayout(state.canvasLayouts[workspaceKey], {
              viewport,
            }),
          },
        })),
      setCanvasNodePositions: (workspaceKey, positions) =>
        set((state) => {
          const currentLayout = state.canvasLayouts[workspaceKey];
          const currentPositions = currentLayout?.nodePositions ?? EMPTY_NODE_POSITIONS;
          // A renderer may report its previous frame before a new placement appears.
          const nextPositions = { ...positions };
          for (const instance of currentLayout?.resourceInstances ?? []) {
            if (nextPositions[instance.id] == null && currentPositions[instance.id] != null) {
              nextPositions[instance.id] = currentPositions[instance.id]!;
            }
          }

          if (areCanvasNodePositionsEqual(currentPositions, nextPositions)) {
            return state;
          }

          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: buildWorkspaceCanvasLayout(currentLayout, {
                nodePositions: nextPositions,
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
              [workspaceKey]: buildWorkspaceCanvasLayout(currentLayout, {
                frozenNodeIds: toggleFrozenNodeId(currentFrozenNodeIds, nodeId),
              }),
            },
          };
        }),
      setCanvasInspectorListOrder: (workspaceKey, nodeId, listId, orderedIds) =>
        set((state) => {
          const currentLayout = state.canvasLayouts[workspaceKey];
          const currentOrders = currentLayout?.inspectorListOrdersByNode ?? {};
          const currentNodeOrders = currentOrders[nodeId] ?? {};
          const currentOrder = currentNodeOrders[listId] ?? [];
          if (areOrderedIdsEqual(currentOrder, orderedIds)) return state;

          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: buildWorkspaceCanvasLayout(currentLayout, {
                inspectorListOrdersByNode: {
                  ...currentOrders,
                  [nodeId]: {
                    ...currentNodeOrders,
                    [listId]: [...orderedIds],
                  },
                },
              }),
            },
          };
        }),
      placeCanvasResourceInstance: (workspaceKey, instance, position) =>
        set((state) => {
          const current = state.canvasLayouts[workspaceKey];
          if (
            !instance.id ||
            !instance.resourceId ||
            !Number.isFinite(position.x) ||
            !Number.isFinite(position.y) ||
            current?.resourceInstances?.some((entry) => entry.id === instance.id) ||
            current?.nodePositions[instance.id] != null
          )
            return state;
          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: buildWorkspaceCanvasLayout(current, {
                nodePositions: { ...current?.nodePositions, [instance.id]: position },
                resourceInstances: [...(current?.resourceInstances ?? []), instance],
              }),
            },
          };
        }),
      removeCanvasResourceInstance: (workspaceKey, instanceId) =>
        set((state) => {
          const current = state.canvasLayouts[workspaceKey];
          if (!current?.resourceInstances?.some((entry) => entry.id === instanceId)) return state;
          const nodePositions = { ...current.nodePositions };
          delete nodePositions[instanceId];
          return {
            canvasLayouts: {
              ...state.canvasLayouts,
              [workspaceKey]: buildWorkspaceCanvasLayout(current, {
                nodePositions,
                resourceInstances: current.resourceInstances.filter(
                  (entry) => entry.id !== instanceId
                ),
                ...(current.frozenNodeIds == null
                  ? {}
                  : { frozenNodeIds: current.frozenNodeIds.filter((id) => id !== instanceId) }),
              }),
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
      openContextualWorkbench: (workbenchId, ownerKey) =>
        set((state) =>
          state.contextualWorkbenchId === workbenchId &&
          state.contextualWorkbenchOwnerKey === ownerKey
            ? state
            : { contextualWorkbenchId: workbenchId, contextualWorkbenchOwnerKey: ownerKey }
        ),
      closeContextualWorkbench: () =>
        set((state) =>
          state.contextualWorkbenchId == null && state.contextualWorkbenchOwnerKey == null
            ? state
            : { contextualWorkbenchId: null, contextualWorkbenchOwnerKey: null }
        ),
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
