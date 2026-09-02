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
    onNodeDrag: graphCommands.handleNodeDrag,
    onNodeDragStop: graphCommands.handleNodeDragStop,
    onEdgesChange: graphCommands.onEdgesChange,
    onConnect: graphCommands.onConnect,
    onReconnect: graphCommands.onReconnect,
    onSetEdgeExecutionGate: graphCommands.onSetEdgeExecutionGate,
    onViewportChange: graphCommands.handleViewportChange,
    onDrop: graphCommands.handleDrop,
    onDragOver: graphCommands.handleDragOver,
    onToggleFrozenNode: graphCommands.handleToggleFrozenNode,
    onCreateAuthoringNode: graphCommands.handleCreateAuthoringNode,
    onSourceImportComplete: graphCommands.handleSourceImportComplete,
    onImportedNodeFocusComplete: graphCommands.handleImportedNodeFocusComplete,
    onImpactFocusNodeChange: graphCommands.handleImpactFocusNodeChange,
  };
}
