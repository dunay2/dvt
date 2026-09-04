/**
 * Owned concern: build the graph projection concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellGraphBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellGraph } from './canvasShell.types';

export function buildCanvasShellGraph({
  graphState,
}: CanvasShellGraphBuilderArgs): CanvasShellGraph {
  return {
    nodesWithImpact: graphState.nodesWithImpact,
    edges: graphState.edges,
    nodeTypes: graphState.nodeTypes,
    gridSize: graphState.gridSize,
    canvasPalette: graphState.canvasPalette,
    canvasGridVisible: graphState.canvasGridVisible,
    canvasGridColor: graphState.canvasGridColor,
    canvasSnapToGrid: graphState.canvasSnapToGrid,
    viewport: graphState.viewport,
    frozenNodeIds: graphState.frozenNodeIds,
  };
}
