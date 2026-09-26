/** Bind existing commands and graph interactions to the Canvas presentation DTO. */
import { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import type { useCanvasControllerRuntime } from './useCanvasControllerRuntime';
import type { useCanvasGraphHandlers } from './useCanvasGraphHandlers';
import type { useCanvasMutationHandlers } from './useCanvasMutationHandlers';
import type { useCanvasOverlayModel } from './useCanvasOverlayModel';

type PresentationArgs = Readonly<{
  environment: ReturnType<typeof useCanvasControllerEnvironment>;
  runtime: ReturnType<typeof useCanvasControllerRuntime>;
  graphHandlers: ReturnType<typeof useCanvasGraphHandlers>;
  mutationHandlers: ReturnType<typeof useCanvasMutationHandlers>;
  overlayModel: ReturnType<typeof useCanvasOverlayModel>;
}>;

export function useCanvasControllerPresentation({
  environment,
  runtime,
  graphHandlers,
  mutationHandlers,
  overlayModel,
}: PresentationArgs) {
  const { store, capabilities } = environment;
  const { workspaceScope, canMutateActiveCanvas, canSelectExecution, authoringRuntime } = runtime;
  const { graphModel, uiScope, visibleScope, executionScope, runDraftSessionCommand } =
    authoringRuntime;
  const inspectorCommands = useCanvasInspectorCommands({
    canonicalNodesById: graphModel.canonicalNodesById,
    inspectorNode: uiScope.inspectorNodeId
      ? (graphModel.canonicalNodesById.get(uiScope.inspectorNodeId) ?? null)
      : null,
    runDraftSessionCommand,
    workspaceScope,
    canEditNode: canMutateActiveCanvas,
  });
  const readModel = useCanvasControllerReadModel({
    graphModel: {
      ...graphModel,
      onEdgesChange: mutationHandlers.handleEdgesChange,
    },
    visibleScope,
    executionScope,
    uiScope,
    overlayModel,
    cardActions: {
      onInspectNode: graphHandlers.handleInspectNode,
      onDuplicateNode: graphHandlers.handleDuplicateNode,
      onRemoveNode: graphHandlers.handleRemoveNode,
      onAttachSchemaToNode: graphHandlers.handleAttachSchemaToNode,
      onSetNodeMaterialization: inspectorCommands.setNodeMaterialization,
    },
    columnActions: {
      onColumnPortActivate: graphHandlers.handleColumnPortActivate,
      onApplyCanvasColumnFunction: graphHandlers.handleApplyCanvasColumnFunction,
      onApplyCanvasStructuredField: graphHandlers.handleApplyCanvasStructuredField,
      onAddCanvasCalculatedColumn: graphHandlers.handleAddCanvasCalculatedColumn,
      onToggleCanvasColumnOutput: graphHandlers.handleToggleCanvasColumnOutput,
      onReorderCanvasColumnOutput: graphHandlers.handleReorderCanvasColumnOutput,
      onColumnDisclosureChange: graphHandlers.handleColumnDisclosureChange,
      onAutomapColumns: graphHandlers.handleAutomapCanvasColumns,
    },
    compositionActions: {
      resolveAlgebraicCompositionOperations:
        graphHandlers.resolveCanvasAlgebraicCompositionOperations,
      onComposeCanvasNodes: graphHandlers.handleComposeCanvasNodes,
    },
    activeColumnHandleId: graphHandlers.activeColumnHandleId,
    onRemoveColumnMapping: graphHandlers.handleRemoveColumnMapping,
    onToggleExecutionSelection: graphHandlers.handleToggleNodeSelection,
    runtimeCapabilities: capabilities,
    canMutateGraph: canMutateActiveCanvas,
    canSelectExecution,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
  });

  return { readModel, inspectorCommands };
}
