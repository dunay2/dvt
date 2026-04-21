/**
 * Owned concern: build viewport and import command bindings for the route-owned Canvas shell contract.
 */
import type { CanvasShellGraphCommands } from './canvasShell.types';
import type { CanvasShellBuilderArgs } from './canvasShellBuilder.types';

export function buildCanvasShellGraphCommands({
  controller,
}: CanvasShellBuilderArgs): CanvasShellGraphCommands {
  return {
    onNodesChange: controller.onNodesChange,
    onNodeDragStop: controller.handleNodeDragStop,
    onEdgesChange: controller.onEdgesChange,
    onConnect: controller.onConnect,
    onNodeClick: controller.handleNodeClick,
    onSelectionChange: controller.onSelectionChange,
    onViewportChange: controller.handleViewportChange,
    onDrop: controller.handleDrop,
    onDragOver: controller.handleDragOver,
    onSourceImportComplete: controller.handleSourceImportComplete,
    onImportedNodeFocusComplete: controller.handleImportedNodeFocusComplete,
  };
}
