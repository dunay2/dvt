/**
 * Owned concern: build viewport and import command bindings for the route-owned Canvas shell contract.
 */
import type { CanvasShellGraphCommandsBuilderArgs } from './canvasShellBuilder.types';
import type { CanvasShellGraphCommands } from './canvasShell.types';

export function buildCanvasShellGraphCommands({
  graphCommands,
}: CanvasShellGraphCommandsBuilderArgs): CanvasShellGraphCommands {
  return {
    onNodesChange: graphCommands.onNodesChange,
    onNodeDragStop: graphCommands.handleNodeDragStop,
    onEdgesChange: graphCommands.onEdgesChange,
    onConnect: graphCommands.onConnect,
    onNodeClick: graphCommands.handleNodeClick,
    onSelectionChange: graphCommands.onSelectionChange,
    onViewportChange: graphCommands.handleViewportChange,
    onDrop: graphCommands.handleDrop,
    onDragOver: graphCommands.handleDragOver,
    onCreateAuthoringNode: graphCommands.handleCreateAuthoringNode,
    onSourceImportComplete: graphCommands.handleSourceImportComplete,
    onImportedNodeFocusComplete: graphCommands.handleImportedNodeFocusComplete,
  };
}
