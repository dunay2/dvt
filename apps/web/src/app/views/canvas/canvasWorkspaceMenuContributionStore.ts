/** Owned concern: hold the active Canvas route contribution to the shell Workspace menu. */
import { create } from 'zustand';

import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';

export type CanvasModelView = 'semantic' | 'sql';
export type CanvasModelBrowserContribution = Readonly<{
  canvasId: string;
  mode: CanvasModelView | null;
  onBrowse: (view: CanvasModelView) => void;
  onCanvas: () => void;
}>;

export type CanvasWorkspaceMenuContribution = Readonly<{
  activeCanvas?: ProjectCanvasDocument | null;
  canvasDocuments?: readonly ProjectCanvasDocument[];
  onSelectCanvas?: (canvasId: string) => void;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  canOpenProjectCode?: boolean;
  onExportProjectSnapshot?: () => void;
  onImportProjectSnapshotFile?: (file: File) => void;
  onOpenProjectCode?: () => void;
  codeTab?: Readonly<{
    active: boolean;
    onSelect: () => void;
    onCanvas: () => void;
    onClose?: () => void;
  }>;
}>;

export type CanvasModelWorkspaceTabContribution = Readonly<{
  canvasId: string;
  nodeId: string;
  label: string;
  active: boolean;
  onSelect: () => void;
  onCanvas: () => void;
  onClose: (afterClose?: () => void) => void;
  views?: Readonly<{
    active: CanvasModelView;
    sqlPanelId: string;
    disabled: boolean;
    semantic: () => void;
    sql: () => void;
  }>;
}>;

export type CanvasModelTabListContribution = Readonly<{
  canvasId: string;
  tabs: readonly Readonly<{
    nodeId: string;
    label: string;
    onSelect: () => void;
    onClose: () => void;
  }>[];
}>;

type CanvasWorkspaceMenuContributionState = {
  modelBrowser: CanvasModelBrowserContribution | null;
  registerModelBrowser: (browser: CanvasModelBrowserContribution) => void;
  clearModelBrowser: (browser: CanvasModelBrowserContribution) => void;
  modelTab: CanvasModelWorkspaceTabContribution | null;
  registerModelTab: (tab: CanvasModelWorkspaceTabContribution) => void;
  clearModelTab: (tab: CanvasModelWorkspaceTabContribution) => void;
  modelTabList: CanvasModelTabListContribution | null;
  registerModelTabList: (list: CanvasModelTabListContribution) => void;
  clearModelTabList: (list: CanvasModelTabListContribution) => void;
  contribution: CanvasWorkspaceMenuContribution | null;
  registerCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
  clearCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
};

export const useCanvasWorkspaceMenuContributionStore = create<CanvasWorkspaceMenuContributionState>(
  (set) => ({
    contribution: null,
    modelBrowser: null,
    registerModelBrowser: (modelBrowser) => set({ modelBrowser }),
    clearModelBrowser: (browser) =>
      set((state) => (state.modelBrowser === browser ? { modelBrowser: null } : state)),
    modelTab: null,
    registerModelTab: (modelTab) => set({ modelTab }),
    clearModelTab: (tab) => set((state) => (state.modelTab === tab ? { modelTab: null } : state)),
    modelTabList: null,
    registerModelTabList: (modelTabList) => set({ modelTabList }),
    clearModelTabList: (list) =>
      set((state) => (state.modelTabList === list ? { modelTabList: null } : state)),
    registerCanvasWorkspaceMenuContribution: (contribution) => set({ contribution }),
    clearCanvasWorkspaceMenuContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
  })
);
