/**
 * Owned concern: build the graph projection concern of the route-owned Canvas shell contract.
 */
import type { CanvasShellGraph } from './canvasShell.types';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';

export function buildCanvasShellGraph({
  controller,
}: CanvasShellBuilderArgs): CanvasShellGraph {
  return {
    nodesWithImpact: controller.nodesWithImpact,
    edges: controller.edges,
    nodeTypes: controller.nodeTypes,
    gridSize: controller.gridSize,
    canvasPalette: controller.canvasPalette,
    viewport: controller.viewport,
  };
}
