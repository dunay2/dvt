/** Owned concern: hold the active Canvas route contribution to the shell Workspace menu. */
import { create } from 'zustand';

import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';

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
}>;

type CanvasWorkspaceMenuContributionState = {
  modelTab: CanvasModelWorkspaceTabContribution | null;
  registerModelTab: (tab: CanvasModelWorkspaceTabContribution) => void;
  clearModelTab: (tab: CanvasModelWorkspaceTabContribution) => void;
  contribution: CanvasWorkspaceMenuContribution | null;
  registerCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
  clearCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
};

export const useCanvasWorkspaceMenuContributionStore = create<CanvasWorkspaceMenuContributionState>(
  (set) => ({
    contribution: null,
    modelTab: null,
    registerModelTab: (modelTab) => set({ modelTab }),
    clearModelTab: (tab) => set((state) => (state.modelTab === tab ? { modelTab: null } : state)),
    registerCanvasWorkspaceMenuContribution: (contribution) => set({ contribution }),
    clearCanvasWorkspaceMenuContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
  })
);
