import { create } from 'zustand';

import type { EditorTab, PaletteMode, SidebarSection } from './workbenchTypes';

export const DEFAULT_GRAPH_TAB: EditorTab = {
  id: 'canvas:graph',
  kind: 'graph',
  title: 'Canvas',
  path: 'workspace/canvas',
  readOnly: true,
  closable: false,
  description: 'Primary graph workspace',
};

interface WorkbenchPaletteState {
  open: boolean;
  mode: PaletteMode;
  query: string;
}

interface CanvasWorkbenchState {
  sidebarSection: SidebarSection;
  openTabs: EditorTab[];
  activeTabId: string;
  palette: WorkbenchPaletteState;
  setSidebarSection: (section: SidebarSection) => void;
  openOrActivateTab: (tab: EditorTab) => void;
  activateTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  openPalette: (mode: PaletteMode) => void;
  closePalette: () => void;
  setPaletteQuery: (query: string) => void;
  reset: () => void;
}

function withGraphTab(tabs: EditorTab[]): EditorTab[] {
  if (tabs.some((tab) => tab.id === DEFAULT_GRAPH_TAB.id)) {
    return tabs;
  }

  return [DEFAULT_GRAPH_TAB, ...tabs];
}

export const useCanvasWorkbenchStore = create<CanvasWorkbenchState>((set) => ({
  sidebarSection: 'explorer',
  openTabs: [DEFAULT_GRAPH_TAB],
  activeTabId: DEFAULT_GRAPH_TAB.id,
  palette: {
    open: false,
    mode: 'files',
    query: '',
  },
  setSidebarSection: (section) => {
    set({ sidebarSection: section });
  },
  openOrActivateTab: (tab) => {
    set((state) => {
      const existingIndex = state.openTabs.findIndex((candidate) => candidate.id === tab.id);
      if (existingIndex >= 0) {
        const nextTabs = [...state.openTabs];
        nextTabs[existingIndex] = {
          ...nextTabs[existingIndex],
          ...tab,
        };

        return {
          openTabs: withGraphTab(nextTabs),
          activeTabId: tab.id,
        };
      }

      return {
        openTabs: withGraphTab([...state.openTabs, tab]),
        activeTabId: tab.id,
      };
    });
  },
  activateTab: (tabId) => {
    set({ activeTabId: tabId });
  },
  closeTab: (tabId) => {
    set((state) => {
      const target = state.openTabs.find((tab) => tab.id === tabId);
      if (!target || target.closable === false) {
        return state;
      }

      const nextTabs = withGraphTab(state.openTabs.filter((tab) => tab.id !== tabId));
      const nextActiveTabId =
        state.activeTabId === tabId ? (nextTabs.at(-1)?.id ?? DEFAULT_GRAPH_TAB.id) : state.activeTabId;

      return {
        openTabs: nextTabs,
        activeTabId: nextActiveTabId,
      };
    });
  },
  openPalette: (mode) => {
    set({
      palette: {
        open: true,
        mode,
        query: '',
      },
    });
  },
  closePalette: () => {
    set((state) => ({
      palette: {
        ...state.palette,
        open: false,
        query: '',
      },
    }));
  },
  setPaletteQuery: (query) => {
    set((state) => ({
      palette: {
        ...state.palette,
        query,
      },
    }));
  },
  reset: () => {
    set({
      sidebarSection: 'explorer',
      openTabs: [DEFAULT_GRAPH_TAB],
      activeTabId: DEFAULT_GRAPH_TAB.id,
      palette: {
        open: false,
        mode: 'files',
        query: '',
      },
    });
  },
}));
