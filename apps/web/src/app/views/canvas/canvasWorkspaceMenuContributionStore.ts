/** Owned concern: hold the active Canvas route contribution to the shell Workspace menu. */
import { create } from 'zustand';

export type CanvasWorkspaceMenuContribution = Readonly<{
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
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
