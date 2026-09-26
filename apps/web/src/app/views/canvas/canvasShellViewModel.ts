/** Owned concern: assemble the existing Canvas context projections for the shell. */
import type { NodeTypes } from '@xyflow/react';
import DbtNodeComponent from '../../components/canvas/DbtNodeComponent';
import type { CanvasSurfaceStrategy } from '../../plugins/canvasSurfaceStrategyContracts';
import { getAllCanvasKinds, getRegisteredPluginIds } from '../../plugins/registry';
import type { CanvasRuntimePolicy } from './canvasRuntimePolicy';
import type { useCanvasAuthoringRuntime } from './useCanvasAuthoringRuntime';
import type { useCanvasControllerEnvironment } from './useCanvasControllerEnvironment';
import type { useCanvasControllerReadModel } from './useCanvasControllerReadModel';
import type { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import type { useCanvasOverlayModel } from './useCanvasOverlayModel';
import {
  listProjectCanvasDocuments,
  resolveActiveProjectCanvasId,
} from './canvasProjectCanvasLifecycle';

const canvasControllerNodeTypes: NodeTypes = { dbtNode: DbtNodeComponent };
type CanvasAuthoringRuntime = ReturnType<typeof useCanvasAuthoringRuntime>;
export type CanvasShellViewModelArgs = Readonly<{
  environment: ReturnType<typeof useCanvasControllerEnvironment>;
  authoringRuntime: CanvasAuthoringRuntime;
  overlayModel: ReturnType<typeof useCanvasOverlayModel>;
  readModel: ReturnType<typeof useCanvasControllerReadModel>;
  inspectorCommands: ReturnType<typeof useCanvasInspectorCommands>;
  graphPolicy: {
    runtimePolicy: CanvasRuntimePolicy;
    surfaceStrategy: CanvasSurfaceStrategy | null;
  };
}>;
function resolveCanvasGraphErrorMessage(authoringRuntime: CanvasAuthoringRuntime): string | null {
  const graphError = authoringRuntime.graphModel.graphAuthorityQuery.error;
  return graphError instanceof Error ? graphError.message : null;
}

function resolveRouteDraftRecord({
  draftReadModel,
  draftSession,
}: Pick<CanvasAuthoringRuntime, 'draftReadModel' | 'draftSession'>) {
  if (draftReadModel?.record != null) {
    return draftReadModel.record;
  }

  if (draftReadModel?.accessMode === 'forbidden' || draftReadModel?.formatError != null) {
    return null;
  }

  return draftSession.baseline.record;
}

export function buildCanvasShellViewModel(args: CanvasShellViewModelArgs) {
  const {
    environment: { applicationLanguage, capabilities, store },
    graphPolicy: { runtimePolicy, surfaceStrategy },
    authoringRuntime: {
      backendPosture,
      graphModel,
      visibleScope,
      draftReadModel,
      draftSession,
      canCreateCanvasDocument,
    },
    overlayModel,
    readModel: { nodesWithImpact, edgesWithImpact, inspectorNode },
  } = args;
  const routeDraftRecord = resolveRouteDraftRecord({ draftReadModel, draftSession });
  const routeDraft = routeDraftRecord?.draft ?? null;

  return {
    workspaceLayoutKey: store.workspaceLayoutKey,
    workspaceScope: args.environment.sessionContext.getWorkspaceScopeSnapshot(),
    isBackendCheckPending: backendPosture.isBackendCheckPending,
    backendReady: backendPosture.backendReady,
    backendBlockMessage: backendPosture.backendBlockMessage,
    isLoadingGraph: graphModel.graphAuthorityQuery.isPending,
    graphErrorMessage: resolveCanvasGraphErrorMessage(args.authoringRuntime),
    focusMode: store.focusMode,
    inspectorPanelVisible: store.inspectorPanelVisible,
    inspectorNode,
    inspectorPreferredTabId: store.inspectorPreferredTabId,
    inspectorPreferredTabRequestId: store.inspectorPreferredTabRequestId,
    inspectorGraphNodes: graphModel.canonicalNodes,
    inspectorGraphEdges: visibleScope.canonicalEdges,
    activeRunId: overlayModel.activeRunId,
    registeredPlugins: getRegisteredPluginIds(capabilities),
    runtimeCapabilities: capabilities,
    availableCanvasKinds: getAllCanvasKinds(capabilities, applicationLanguage),
    canvasDocument: routeDraft?.canvas ?? null,
    canvasDocuments: listProjectCanvasDocuments(routeDraft),
    activeCanvasId: resolveActiveProjectCanvasId(routeDraft),
    executionEnvironmentOptions: args.environment.workspaceBootstrapConfig.environmentOptions,
    canCreateCanvasDocument: canCreateCanvasDocument && routeDraftRecord == null,
    authorizationPermissions: store.userPermissions,
    userPermissions: {
      ...store.userPermissions,
      canPlan: runtimePolicy.commands.canPlan,
      canRun: runtimePolicy.commands.canRun,
      canEditEdges: runtimePolicy.commands.canMutateGraph,
    },
    canvasSurfaceStrategy: surfaceStrategy,
    canOpenSourceImport: runtimePolicy.commands.canOpenSourceImport,
    nodesWithImpact,
    edges: edgesWithImpact,
    nodeTypes: canvasControllerNodeTypes,
    gridSize: store.gridSize,
    canvasPalette: store.canvasPalette,
    canvasGridVisible: store.canvasGridVisible,
    canvasGridColor: store.canvasGridColor,
    canvasSnapToGrid: store.canvasSnapToGrid,
    viewport: store.persistedViewport,
    frozenNodeIds: store.frozenNodeIds,
    canEditInspectorNode: runtimePolicy.commands.canEditInspectorNode,
    applyInspectorNodeDraft: args.inspectorCommands.applyInspectorNodeDraft,
    applyNodeDraft: args.inspectorCommands.applyNodeDraft,
  };
}
