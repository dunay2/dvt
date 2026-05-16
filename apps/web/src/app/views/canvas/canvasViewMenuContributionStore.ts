/** Owned concern: hold the active Canvas route contribution to the shell View menu. */
import { create } from 'zustand';

import type { CanvasPaletteId } from './canvasPalette';

export type CanvasViewMenuContribution = Readonly<{
  canEditEdges: boolean;
  canUseCostOverlay: boolean;
  exclusiveOverlayMode: 'runtime' | 'cost';
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
}>;

type CanvasViewMenuContributionState = {
  contribution: CanvasViewMenuContribution | null;
  registerCanvasViewMenuContribution: (contribution: CanvasViewMenuContribution) => void;
  clearCanvasViewMenuContribution: () => void;
};

export const useCanvasViewMenuContributionStore = create<CanvasViewMenuContributionState>(
  (set) => ({
    contribution: null,
    registerCanvasViewMenuContribution: (contribution) => set({ contribution }),
    clearCanvasViewMenuContribution: () => set({ contribution: null }),
  })
);
