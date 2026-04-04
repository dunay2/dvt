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
};

interface CanvasInteractionState {
  _hasHydrated: boolean;
  selectedNodes: string[];
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasLayouts: Record<string, WorkspaceCanvasLayout>;
  inspectorNodeId: string | null;

  setSelectedNodes: (nodes: string[]) => void;
  toggleImpactOverlay: () => void;
  toggleColumnLevelLineage: () => void;
  setCanvasViewport: (workspaceKey: string, viewport: CanvasViewportState | null) => void;
  setCanvasNodePositions: (workspaceKey: string, positions: Record<string, CanvasPosition>) => void;
  setInspectorNode: (nodeId: string | null) => void;
}

export type { CanvasPosition, CanvasViewportState, WorkspaceCanvasLayout };

export const useCanvasInteractionStore = create<CanvasInteractionState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      selectedNodes: [],
      impactOverlayEnabled: false,
      columnLevelLineageEnabled: false,
      canvasLayouts: {},
      inspectorNodeId: null,

      setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
      toggleImpactOverlay: () =>
        set((state) => ({ impactOverlayEnabled: !state.impactOverlayEnabled })),
      toggleColumnLevelLineage: () =>
        set((state) => ({ columnLevelLineageEnabled: !state.columnLevelLineageEnabled })),
      setCanvasViewport: (workspaceKey, viewport) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: {
              viewport,
              nodePositions: state.canvasLayouts[workspaceKey]?.nodePositions ?? {},
            },
          },
        })),
      setCanvasNodePositions: (workspaceKey, positions) =>
        set((state) => ({
          canvasLayouts: {
            ...state.canvasLayouts,
            [workspaceKey]: {
              viewport: state.canvasLayouts[workspaceKey]?.viewport ?? null,
              nodePositions: positions,
            },
          },
        })),
      setInspectorNode: (nodeId) => set({ inspectorNodeId: nodeId }),
    }),
    {
      name: 'dvt-web-canvas-interaction',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {
        useCanvasInteractionStore.setState({ _hasHydrated: true });
      },
      partialize: (state) => ({
        impactOverlayEnabled: state.impactOverlayEnabled,
        columnLevelLineageEnabled: state.columnLevelLineageEnabled,
        canvasLayouts: state.canvasLayouts,
      }),
    }
  )
);
