/** Owned concern: own workbench shell layout commands and visual preferences. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  DEFAULT_CANVAS_GRID_COLOR,
  DEFAULT_CANVAS_PALETTE_ID,
  normalizeCanvasHexColor,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from '../views/canvas/canvasPalette';

type TabType = 'canvas' | 'run' | 'diff' | 'lineage' | 'code';

interface UiLayoutState {
  leftNavCollapsed: boolean;
  inspectorPanelWidth: number;
  inspectorPanelVisible: boolean;
  bottomDrawerHeight: number;
  bottomDrawerVisible: boolean;
  focusMode: boolean;
  gridSize: number;
  canvasPalette: CanvasPaletteId;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  canvasEmptyStateGuideVisible: boolean;

  activeTabs: Array<{
    id: string;
    type: TabType;
    label: string;
    data?: unknown;
  }>;
  activeTabId: string | null;

  toggleLeftNav: () => void;
  setInspectorPanelWidth: (width: number) => void;
  setBottomDrawerHeight: (height: number) => void;
  toggleFocusMode: () => void;
  toggleInspectorPanel: () => void;
  toggleBottomDrawer: () => void;
  hideBottomDrawer: () => void;
  showInspectorPanel: () => void;
  hideInspectorPanel: () => void;
  setGridSize: (size: number) => void;
  setCanvasPalette: (palette: CanvasPaletteId) => void;
  setCanvasGridVisible: (visible: boolean) => void;
  setCanvasGridColor: (color: CanvasPaletteId) => void;
  setCanvasSnapToGrid: (enabled: boolean) => void;
  setCanvasEmptyStateGuideVisible: (visible: boolean) => void;
  addTab: (tab: { id: string; type: TabType; label: string; data?: unknown }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

type PersistedUiLayoutState = Partial<
  Pick<
    UiLayoutState,
    | 'leftNavCollapsed'
    | 'inspectorPanelWidth'
    | 'bottomDrawerHeight'
    | 'bottomDrawerVisible'
    | 'focusMode'
    | 'gridSize'
    | 'canvasPalette'
    | 'canvasGridVisible'
    | 'canvasGridColor'
    | 'canvasSnapToGrid'
    | 'canvasEmptyStateGuideVisible'
  >
>;

export const useUiLayoutStore = create<UiLayoutState>()(
  persist(
    (set) => ({
      leftNavCollapsed: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      bottomDrawerHeight: 0,
      bottomDrawerVisible: false,
      focusMode: false,
      gridSize: 20,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
      canvasGridVisible: true,
      canvasGridColor: DEFAULT_CANVAS_GRID_COLOR,
      canvasSnapToGrid: false,
      canvasEmptyStateGuideVisible: true,

      activeTabs: [{ id: 'main-canvas', type: 'canvas' as TabType, label: 'Main Graph' }],
      activeTabId: 'main-canvas',

      toggleLeftNav: () => set((state) => ({ leftNavCollapsed: !state.leftNavCollapsed })),
      setInspectorPanelWidth: (width) => set({ inspectorPanelWidth: width }),
      setBottomDrawerHeight: (height) => set({ bottomDrawerHeight: height }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleInspectorPanel: () =>
        set((state) => ({ inspectorPanelVisible: !state.inspectorPanelVisible })),
      toggleBottomDrawer: () =>
        set((state) => {
          const next = !state.bottomDrawerVisible;
          return { bottomDrawerVisible: next, bottomDrawerHeight: next ? 160 : 0 };
        }),
      hideBottomDrawer: () => set({ bottomDrawerVisible: false, bottomDrawerHeight: 0 }),
      showInspectorPanel: () => set({ inspectorPanelVisible: true }),
      hideInspectorPanel: () => set({ inspectorPanelVisible: false }),
      setGridSize: (size) => set({ gridSize: size }),
      setCanvasPalette: (palette) => set({ canvasPalette: normalizeCanvasPaletteId(palette) }),
      setCanvasGridVisible: (visible) => set({ canvasGridVisible: visible }),
      setCanvasGridColor: (color) =>
        set({ canvasGridColor: normalizeCanvasHexColor(color, DEFAULT_CANVAS_GRID_COLOR) }),
      setCanvasSnapToGrid: (enabled) => set({ canvasSnapToGrid: enabled }),
      setCanvasEmptyStateGuideVisible: (visible) => set({ canvasEmptyStateGuideVisible: visible }),

      addTab: (tab) =>
        set((state) => ({
          activeTabs: [...state.activeTabs, tab],
          activeTabId: tab.id,
        })),
      closeTab: (tabId) =>
        set((state) => {
          const newTabs = state.activeTabs.filter((t) => t.id !== tabId);
          const nextActiveTab = newTabs.at(-1);
          const newActiveId =
            state.activeTabId === tabId && nextActiveTab ? nextActiveTab.id : state.activeTabId;
          return { activeTabs: newTabs, activeTabId: newActiveId };
        }),
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
    }),
    {
      name: 'dvt-web-ui-layout',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persistedLayoutState =
          typeof persistedState === 'object' && persistedState != null
            ? (persistedState as PersistedUiLayoutState)
            : {};

        return {
          ...currentState,
          leftNavCollapsed: persistedLayoutState.leftNavCollapsed ?? currentState.leftNavCollapsed,
          inspectorPanelWidth:
            persistedLayoutState.inspectorPanelWidth ?? currentState.inspectorPanelWidth,
          inspectorPanelVisible: currentState.inspectorPanelVisible,
          bottomDrawerHeight:
            persistedLayoutState.bottomDrawerHeight ?? currentState.bottomDrawerHeight,
          bottomDrawerVisible:
            persistedLayoutState.bottomDrawerVisible ?? currentState.bottomDrawerVisible,
          focusMode: persistedLayoutState.focusMode ?? currentState.focusMode,
          gridSize: persistedLayoutState.gridSize ?? currentState.gridSize,
          canvasPalette: normalizeCanvasPaletteId(
            persistedLayoutState.canvasPalette ?? currentState.canvasPalette
          ),
          canvasGridVisible:
            typeof persistedLayoutState.canvasGridVisible === 'boolean'
              ? persistedLayoutState.canvasGridVisible
              : currentState.canvasGridVisible,
          canvasGridColor: normalizeCanvasHexColor(
            persistedLayoutState.canvasGridColor,
            DEFAULT_CANVAS_GRID_COLOR
          ),
          canvasSnapToGrid:
            typeof persistedLayoutState.canvasSnapToGrid === 'boolean'
              ? persistedLayoutState.canvasSnapToGrid
              : currentState.canvasSnapToGrid,
          canvasEmptyStateGuideVisible:
            typeof persistedLayoutState.canvasEmptyStateGuideVisible === 'boolean'
              ? persistedLayoutState.canvasEmptyStateGuideVisible
              : currentState.canvasEmptyStateGuideVisible,
        };
      },
      partialize: (state) => ({
        leftNavCollapsed: state.leftNavCollapsed,
        inspectorPanelWidth: state.inspectorPanelWidth,
        bottomDrawerHeight: state.bottomDrawerHeight,
        bottomDrawerVisible: state.bottomDrawerVisible,
        focusMode: state.focusMode,
        gridSize: state.gridSize,
        canvasPalette: state.canvasPalette,
        canvasGridVisible: state.canvasGridVisible,
        canvasGridColor: state.canvasGridColor,
        canvasSnapToGrid: state.canvasSnapToGrid,
        canvasEmptyStateGuideVisible: state.canvasEmptyStateGuideVisible,
      }),
    }
  )
);
