/** Own Canvas draft lifecycle and admission policy; no card markup or interaction bindings. */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveActiveCanvasGraphStrategy,
  selectActiveCanvasExecutionStrategy,
  selectActiveCanvasGraphStrategy,
  selectActiveCanvasSurfaceStrategy,
} from './canvasActiveGraphStrategy';
import { applyCanvasDraftPostureToRuntimePolicyInput } from './canvasDraftAccessPostureModel';
import { resolveGraphDraftAuthoringCanvasId } from './canvasDraftReadModel';
import { resolveCanvasRuntimePolicy } from './canvasRuntimePolicy';
import { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';

type CanvasEnvironment = ReturnType<typeof useCanvasControllerEnvironment>;

export function useCanvasControllerRuntime(environment: CanvasEnvironment) {
  const {
    capabilities,
    platformHealthQuery,
    workspaceGraphDraftAuthoringPort,
    sessionContext,
    workspaceBootstrapConfig,
    store,
    hasAuthorizedSourceImportContribution,
  } = environment;
  const workspaceScope = sessionContext.getWorkspaceScopeSnapshot();
  const previousWorkspaceLayoutKeyRef = useRef(store.workspaceLayoutKey);
  const [impactFocusNodeId, setImpactFocusNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (previousWorkspaceLayoutKeyRef.current === store.workspaceLayoutKey) {
      return;
    }

    previousWorkspaceLayoutKeyRef.current = store.workspaceLayoutKey;
    setImpactFocusNodeId(null);
    store.setExecutionSelectionIntent(createCanvasExecutionSelectionIntent([]));
    store.setInspectorNode(null);
    store.closeContextualWorkbench();
    store.setCurrentPlan(null);
    store.setCurrentRun(null);
  }, [
    store.closeContextualWorkbench,
    store.setCurrentPlan,
    store.setCurrentRun,
    store.setExecutionSelectionIntent,
    store.setInspectorNode,
    store.workspaceLayoutKey,
  ]);

  const authoringRuntime = useCanvasAuthoringRuntime({
    platformHealthQuery: {
      isPending: platformHealthQuery.isPending,
      isError: platformHealthQuery.isError,
      data: platformHealthQuery.data,
      error: platformHealthQuery.error,
      failureCount: platformHealthQuery.failureCount,
      errorUpdatedAt: platformHealthQuery.errorUpdatedAt,
    },
    workspaceGraphDraftAuthoringPort,
    workspaceLayoutKey: store.workspaceLayoutKey,
    columnLevelLineageEnabled: store.columnLevelLineageEnabled,
    persistedNodePositions: store.persistedNodePositions,
    frozenNodeIds: store.frozenNodeIds,
    selectionIntent: store.executionSelectionIntent,
    inspectorNodeId: store.inspectorNodeId,
    canPersistGraphDraftTransport: store.userPermissions.canPersistGraphDraft,
    canMutateGraphTransport: store.userPermissions.canEditEdges,
    workspaceScope,
    previewProvenanceConfig: workspaceBootstrapConfig,
    setCanvasNodePositions: store.setCanvasNodePositions,
  });

  const {
    draftReadModel,
    draftAccessPosture,
    canMutateGraph,
    isDraftRecoveryBlocked,
    executionScope,
  } = authoringRuntime;
  const activeCanvasGraphStrategyResolution = useMemo(
    () => resolveActiveCanvasGraphStrategy(draftReadModel, capabilities),
    [capabilities, draftReadModel?.record?.draft.canvas.kind]
  );
  const graphStrategy = selectActiveCanvasGraphStrategy(activeCanvasGraphStrategyResolution);
  const executionStrategy = selectActiveCanvasExecutionStrategy(
    activeCanvasGraphStrategyResolution
  );
  const surfaceStrategy = selectActiveCanvasSurfaceStrategy(activeCanvasGraphStrategyResolution);
  const resolvedGraphDraftCanvasId = resolveGraphDraftAuthoringCanvasId(draftReadModel);
  const hasResolvedGraphDraftAuthority = resolvedGraphDraftCanvasId !== null;
  const runtimePolicy = useMemo(() => {
    const draftAdmission = applyCanvasDraftPostureToRuntimePolicyInput({
      posture: draftAccessPosture,
      canMutateGraph: canMutateGraph && hasResolvedGraphDraftAuthority,
      canPlan:
        store.userPermissions.canPlan && !isDraftRecoveryBlocked && hasResolvedGraphDraftAuthority,
      canRun:
        store.userPermissions.canRun && !isDraftRecoveryBlocked && hasResolvedGraphDraftAuthority,
      canReloadLatestDraft: authoringRuntime.draftStatusState.showReloadAction,
    });

    return resolveCanvasRuntimePolicy({
      activeRuntime: activeCanvasGraphStrategyResolution,
      canMutateGraph: draftAdmission.canMutateGraph,
      canOpenSourceImport: hasAuthorizedSourceImportContribution,
      canPlan: draftAdmission.canPlan,
      canRun: draftAdmission.canRun,
      canReloadLatestDraft: draftAdmission.canReloadLatestDraft,
    });
  }, [
    activeCanvasGraphStrategyResolution,
    authoringRuntime.draftStatusState.showReloadAction,
    canMutateGraph,
    draftAccessPosture,
    hasResolvedGraphDraftAuthority,
    isDraftRecoveryBlocked,
    store.userPermissions.canPlan,
    store.userPermissions.canRun,
    hasAuthorizedSourceImportContribution,
  ]);
  const canMutateActiveCanvas = runtimePolicy.commands.canMutateGraph;
  const canSelectExecution = runtimePolicy.commands.canPlan || runtimePolicy.commands.canRun;
  const executionSelectionIntent = useMemo(
    () =>
      createCanvasExecutionSelectionIntent(
        executionScope.selectedNodeIds,
        executionScope.selectionMode
      ),
    [executionScope.selectedNodeIds, executionScope.selectionMode]
  );

  return {
    authoringRuntime,
    workspaceScope,
    runtimePolicy,
    graphStrategy,
    executionStrategy,
    surfaceStrategy,
    resolvedGraphDraftCanvasId,
    canMutateActiveCanvas,
    canSelectExecution,
    executionSelectionIntent,
    impactFocusNodeId,
    setImpactFocusNodeId,
  };
}
