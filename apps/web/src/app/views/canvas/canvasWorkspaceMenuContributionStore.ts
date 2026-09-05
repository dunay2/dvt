/** Owned concern: hold the active Canvas route contribution to the shell Workspace menu. */
import { create } from 'zustand';

import type { ProjectCanvasDocument } from './canvasProjectCanvasLifecycle';

export type CanvasWorkspaceMenuContribution = Readonly<{
  activeCanvas?: ProjectCanvasDocument | null;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  canImportDbtProject?: boolean;
  canOpenProjectExplorer?: boolean;
  canOpenProjectCode?: boolean;
  onExportProjectSnapshot?: () => void;
  onImportProjectSnapshotFile?: (file: File) => void;
  onImportDbtProject?: () => void;
  onOpenProjectExplorer?: () => void;
  onOpenProjectCode?: () => void;
}>;

type CanvasWorkspaceMenuContributionState = {
  contribution: CanvasWorkspaceMenuContribution | null;
  registerCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
  clearCanvasWorkspaceMenuContribution: (contribution: CanvasWorkspaceMenuContribution) => void;
};

export const useCanvasWorkspaceMenuContributionStore = create<CanvasWorkspaceMenuContributionState>(
  (set) => ({
    contribution: null,
    registerCanvasWorkspaceMenuContribution: (contribution) => set({ contribution }),
    clearCanvasWorkspaceMenuContribution: (contribution) =>
      set((state) => (state.contribution === contribution ? { contribution: null } : state)),
  })
);
