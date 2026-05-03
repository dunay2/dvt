/** Owned concern: own workbench shell layout commands and visual preferences. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  DEFAULT_CANVAS_PALETTE_ID,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from '../views/canvas/canvasPalette';

type TabType = 'canvas' | 'run' | 'diff' | 'lineage' | 'code';

interface UiLayoutState {
  leftNavCollapsed: boolean;
  explorerPanelWidth: number;
  explorerPanelVisible: boolean;
  inspectorPanelWidth: number;
  inspectorPanelVisible: boolean;
  consolePanelHeight: number;
  consolePanelVisible: boolean;
  focusMode: boolean;
  gridSize: number;
  canvasPalette: CanvasPaletteId;

  activeTabs: Array<{
    id: string;
    type: TabType;
    label: string;
    data?: unknown;
  }>;
  activeTabId: string | null;

  toggleLeftNav: () => void;
  setExplorerPanelWidth: (width: number) => void;
  setInspectorPanelWidth: (width: number) => void;
  setConsolePanelHeight: (height: number) => void;
  toggleFocusMode: () => void;
  toggleExplorerPanel: () => void;
  toggleInspectorPanel: () => void;
  toggleConsolePanel: () => void;
  hideConsolePanel: () => void;
  showExplorerPanel: () => void;
  hideExplorerPanel: () => void;
  showInspectorPanel: () => void;
  hideInspectorPanel: () => void;
  setGridSize: (size: number) => void;
  setCanvasPalette: (palette: CanvasPaletteId) => void;
  addTab: (tab: { id: string; type: TabType; label: string; data?: unknown }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

type PersistedUiLayoutState = Partial<
  Pick<
    UiLayoutState,
    | 'leftNavCollapsed'
    | 'explorerPanelWidth'
    | 'explorerPanelVisible'
    | 'inspectorPanelWidth'
    | 'inspectorPanelVisible'
    | 'consolePanelHeight'
    | 'consolePanelVisible'
    | 'focusMode'
    | 'gridSize'
    | 'canvasPalette'
  >
>;

export const useUiLayoutStore = create<UiLayoutState>()(
  persist(
    (set) => ({
      leftNavCollapsed: false,
      explorerPanelWidth: 280,
      explorerPanelVisible: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      consolePanelHeight: 0,
      consolePanelVisible: false,
      focusMode: false,
      gridSize: 20,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,

      activeTabs: [{ id: 'main-canvas', type: 'canvas' as TabType, label: 'Main Graph' }],
      activeTabId: 'main-canvas',

      toggleLeftNav: () => set((state) => ({ leftNavCollapsed: !state.leftNavCollapsed })),
      setExplorerPanelWidth: (width) => set({ explorerPanelWidth: width }),
      setInspectorPanelWidth: (width) => set({ inspectorPanelWidth: width }),
      setConsolePanelHeight: (height) => set({ consolePanelHeight: height }),
      toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
      toggleExplorerPanel: () =>
        set((state) => ({ explorerPanelVisible: !state.explorerPanelVisible })),
      toggleInspectorPanel: () =>
        set((state) => ({ inspectorPanelVisible: !state.inspectorPanelVisible })),
      toggleConsolePanel: () =>
        set((state) => {
          const next = !state.consolePanelVisible;
          return { consolePanelVisible: next, consolePanelHeight: next ? 160 : 0 };
        }),
      hideConsolePanel: () => set({ consolePanelVisible: false, consolePanelHeight: 0 }),
      showExplorerPanel: () => set({ explorerPanelVisible: true }),
      hideExplorerPanel: () => set({ explorerPanelVisible: false }),
      showInspectorPanel: () => set({ inspectorPanelVisible: true }),
      hideInspectorPanel: () => set({ inspectorPanelVisible: false }),
      setGridSize: (size) => set({ gridSize: size }),
      setCanvasPalette: (palette) => set({ canvasPalette: normalizeCanvasPaletteId(palette) }),

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
          explorerPanelWidth:
            persistedLayoutState.explorerPanelWidth ?? currentState.explorerPanelWidth,
          explorerPanelVisible:
            persistedLayoutState.explorerPanelVisible ?? currentState.explorerPanelVisible,
          inspectorPanelWidth:
            persistedLayoutState.inspectorPanelWidth ?? currentState.inspectorPanelWidth,
          inspectorPanelVisible:
            persistedLayoutState.inspectorPanelVisible ?? currentState.inspectorPanelVisible,
          consolePanelHeight:
            persistedLayoutState.consolePanelHeight ?? currentState.consolePanelHeight,
          consolePanelVisible:
            persistedLayoutState.consolePanelVisible ?? currentState.consolePanelVisible,
          focusMode: persistedLayoutState.focusMode ?? currentState.focusMode,
          gridSize: persistedLayoutState.gridSize ?? currentState.gridSize,
          canvasPalette: normalizeCanvasPaletteId(
            persistedLayoutState.canvasPalette ?? currentState.canvasPalette
          ),
        };
      },
      partialize: (state) => ({
        leftNavCollapsed: state.leftNavCollapsed,
        explorerPanelWidth: state.explorerPanelWidth,
        explorerPanelVisible: state.explorerPanelVisible,
        inspectorPanelWidth: state.inspectorPanelWidth,
        inspectorPanelVisible: state.inspectorPanelVisible,
        consolePanelHeight: state.consolePanelHeight,
        consolePanelVisible: state.consolePanelVisible,
        focusMode: state.focusMode,
        gridSize: state.gridSize,
        canvasPalette: state.canvasPalette,
      }),
    }
  )
);
