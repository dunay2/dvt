/** Owned concern: decide whether the contextual node workbench is visibly active. */
import type { CanvasSurfaceStrategy } from '../../plugins/canvasSurfaceStrategyContracts';

export type CanvasNodeWorkbenchVisibilityInput = Readonly<{
  focusMode: boolean;
  inspectorPanelVisible: boolean;
  surfaceStrategy: CanvasSurfaceStrategy | null;
  hasInspectorNode: boolean;
}>;

export function isCanvasNodeWorkbenchVisible({
  focusMode,
  inspectorPanelVisible,
  surfaceStrategy,
  hasInspectorNode,
}: CanvasNodeWorkbenchVisibilityInput): boolean {
  return (
    surfaceStrategy?.nodeWorkbench.placement === 'contextual-overlay' &&
    !focusMode &&
    inspectorPanelVisible &&
    hasInspectorNode
  );
}
