/** Owned concern: adapt external dbt project-file authority into the shared Canvas surface contracts. */
import { useMemo, useRef, type ReactNode } from 'react';

import {
  createCompleteRouteBootstrapPresentation,
  createErrorRouteBootstrapPresentation,
  createFailedRouteBootstrapPresentation,
  createPendingRouteBootstrapPresentation,
} from '../../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../../bootstrap/usePublishedRouteBootstrap';
import { cn } from '../../components/ui/utils';
import { dbtCanvasSurfaceStrategy } from '../../plugins/dbt/dbtCanvasSurfaceStrategy';
import { DBT_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasModalHostProps } from './canvasModalHost.types';
import { CANVAS_ROUTE_ID } from './canvasDraftPresentationStore';
import type { CanvasShellProps } from './canvasShell.types';
import { CanvasErrorStateView, CanvasLoadingStateView } from './CanvasStateViews';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { buildDbtExecutionTargetWorkbenchContributions } from './dbtExecutionTargetWorkbenchContribution';
import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';
import { buildDbtYamlDescriptionWorkbenchContributions } from './dbtYamlDescriptionWorkbenchContribution';
import type { SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import { useCanvasRunControlSurface } from './useCanvasRunControlSurface';
import { useDbtProjectFileCanvasController } from './useDbtProjectFileCanvasController';

const FILE_AUTHORITY_SOURCE_IMPORT_KINDS = DBT_NODE_KINDS.filter(
  (registration) => registration.kind === 'dbt:source'
);

type DbtProjectFileAuthorityController = ReturnType<typeof useDbtProjectFileCanvasController>;

type DbtProjectFilesAuthoritySurface = Readonly<{
  shellProps: CanvasShellProps;
  modalHostProps: CanvasModalHostProps;
}>;

function unsupportedFileProjectionCommand(commandName: string): never {
  throw new Error(`${commandName} is unavailable while dbt project files are semantic authority.`);
}

function resolveProjectTitle(projectRoot: string): string {
  const pathSegments = projectRoot.split(/[\\/]/).filter((segment) => segment.length > 0);
  return pathSegments.at(-1) ?? projectRoot;
}

function DbtProjectAuthorityNotice({
  controller,
}: Readonly<{ controller: DbtProjectFileAuthorityController }>): JSX.Element | null {
  const source = controller.query.data;
  if (source == null) return null;

  const codeOnlyCount = source.capabilities.codeOnlyResourceCount;
  if (source.freshness === 'fresh' && source.diagnostics.length === 0 && codeOnlyCount === 0) {
    return null;
  }

  const title =
    source.freshness === 'fresh'
      ? 'Some resources require code'
      : source.freshness === 'stale-last-valid'
        ? 'Showing the last valid dbt analysis'
        : 'dbt project analysis is unavailable';
  const summary = [
    codeOnlyCount > 0
      ? `${codeOnlyCount} resource${codeOnlyCount === 1 ? '' : 's'} can only be changed in Code.`
      : null,
    source.diagnostics.length > 0
      ? `${source.diagnostics.length} diagnostic${source.diagnostics.length === 1 ? '' : 's'} reported.`
      : null,
  ]
    .filter((part): part is string => part != null)
    .join(' ');

  return (
    <div
      data-slot="dbt-project-file-projection-notice"
      className={cn(
        'border-b px-3 py-1.5 text-xs',
        source.freshness === 'fresh'
          ? 'border-(--border-default) bg-(--surface-panel)'
          : 'border-(--status-warning) bg-(--surface-elevated)'
      )}
      aria-live="polite"
    >
      <details>
        <summary className="cursor-pointer font-semibold text-(--text-default)">
          {title}
          {summary.length > 0 ? `: ${summary}` : ''}
        </summary>
        {source.diagnostics.length > 0 ? (
          <ul className="mt-2 grid gap-1 text-(--text-muted)">
            {source.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.path ?? ''}-${index}`}>
                <span className="font-medium text-(--text-default)">{diagnostic.code}</span>
                {`: ${diagnostic.message}`}
                {diagnostic.path == null ? '' : ` (${diagnostic.path})`}
              </li>
            ))}
          </ul>
        ) : null}
      </details>
    </div>
  );
}

function resolveCenterSurface(
  controller: DbtProjectFileAuthorityController
): ReactNode | undefined {
  if (controller.query.isPending) {
    return (
      <CanvasLoadingStateView
        title="Analyzing dbt project"
        message="The server is parsing the scoped project and building its file-authoritative graph."
      />
    );
  }

  if (controller.projectionErrorMessage != null) {
    return (
      <CanvasErrorStateView
        title="dbt project graph unavailable"
        message={controller.projectionErrorMessage}
      />
    );
  }

  return undefined;
}

export function useDbtProjectFilesAuthoritySurface({
  authorityBinding,
  onDbtProjectImported,
  screenToFlowPosition,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
}: Readonly<{
  authorityBinding: DbtProjectFilesAuthorityBinding;
  onDbtProjectImported: NonNullable<CanvasShellProps['onDbtProjectImported']>;
  screenToFlowPosition: NonNullable<CanvasShellProps['canvasContextScreenToFlowPosition']>;
  sourceImportInitialSelection?: CanvasShellProps['sourceImportInitialSelection'];
  onSourceImportInitialSelectionConsumed?: CanvasShellProps['onSourceImportInitialSelectionConsumed'];
}>): DbtProjectFilesAuthoritySurface {
  const controller = useDbtProjectFileCanvasController(authorityBinding);
  const bootstrapPresentation = useMemo(() => {
    if (controller.query.isPending) {
      return createPendingRouteBootstrapPresentation('Analyzing the scoped dbt project.');
    }

    if (controller.projectionErrorMessage != null) {
      return createErrorRouteBootstrapPresentation(controller.projectionErrorMessage);
    }

    const freshness = controller.query.data?.freshness;
    if (freshness === 'invalid' || freshness === 'unavailable') {
      return createFailedRouteBootstrapPresentation(
        'The dbt project remains file-authoritative, but its current analysis is unavailable.'
      );
    }

    return createCompleteRouteBootstrapPresentation(
      freshness === 'stale-last-valid'
        ? 'The last valid file-authoritative dbt graph is ready with diagnostics.'
        : 'The file-authoritative dbt graph is ready.'
    );
  }, [
    controller.projectionErrorMessage,
    controller.query.data?.freshness,
    controller.query.isPending,
  ]);
  usePublishedRouteBootstrap(CANVAS_ROUTE_ID, bootstrapPresentation);

  const codeWorkbenchRef = useRef<SqlContextWorkbenchHandle>(null);
  const runControls = useCanvasRunControlSurface(
    controller.workspaceLayoutKey,
    controller.activeRunId
  );
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const projectRoot = controller.authorityBinding.authority.projectRoot;
  const activeCanvas = {
    id: controller.authorityBinding.canvasId,
    kind: 'dbt',
    title: resolveProjectTitle(projectRoot),
    defaultPermission: 'read' as const,
  };
  const inspectorWorkbenchContributions = [
    ...buildDbtExecutionTargetWorkbenchContributions({
      node: controller.inspectorNode,
      target: controller.query.data?.executionTarget,
      language: applicationLanguage,
    }),
    ...buildDbtYamlDescriptionWorkbenchContributions({
      canvasId: activeCanvas.id,
      node: controller.inspectorNode,
      onProjectChanged: controller.refreshProjectGraphAfterMutation,
      onReloadLatest: controller.reloadNodeDescription,
    }),
    ...buildDbtWorkspaceFileCodeContributions({
      node: controller.inspectorNode,
      projectRoot,
      editorRef: controller.nodeCodeEditorRef,
      reconcilePersistedFile: controller.reconcileCodeFilePersistence,
    }),
  ];
  const contextualWorkbench = buildDbtProjectFileCodeWorkbench({
    copy,
    workbenchRef: codeWorkbenchRef,
    onClose: controller.closeCodeWorkbench,
    reconcilePersistedFile: controller.reconcileCodeFilePersistence,
    projectRoot,
    open: controller.projectCodeWorkbenchOpen,
  });

  const shellProps: CanvasShellProps = {
    layout: {
      focusMode: controller.presentation.focusMode,
      inspectorPanelVisible: controller.presentation.inspectorPanelVisible,
      canOpenSourceImport: true,
      canMoveNodes: true,
      canSelectNodes: true,
      surfaceStrategy: dbtCanvasSurfaceStrategy,
      contextualWorkbench,
      centerSurface: resolveCenterSurface(controller),
      readOnlyBanner: <DbtProjectAuthorityNotice controller={controller} />,
    },
    panels: {
      authoringNodeKinds: FILE_AUTHORITY_SOURCE_IMPORT_KINDS,
      activeCanvasId: activeCanvas.id,
      activeCanvas,
      canvasDocuments: [activeCanvas],
      executionEnvironmentOptions: [],
      inspectorNode: controller.inspectorNode,
      inspectorPreferredTabId: controller.presentation.inspectorPreferredTabId,
      inspectorPreferredTabRequestId: controller.presentation.inspectorPreferredTabRequestId,
      inspectorGraphNodes: controller.canonicalNodes,
      inspectorGraphEdges: controller.canonicalEdges,
      inspectorAuthoring: {
        canEditNode: false,
        onApplyNodeDraft: () => unsupportedFileProjectionCommand('Edit graph node properties'),
      },
      inspectorWorkbenchContributions,
      activeRunId: controller.activeRunId,
      registeredPlugins: controller.registeredPlugins,
      userPermissions: {
        canPlan: controller.execution.canPlan,
        canRun: controller.execution.canRun,
        canEditEdges: false,
      },
      importedNodeFocusIds: controller.importedNodeFocusIds,
      runtimeCapabilities: controller.runtimeCapabilities,
    },
    graph: {
      nodesWithImpact: controller.nodesWithCommands,
      edges: controller.edges,
      nodeTypes: controller.nodeTypes,
      gridSize: controller.presentation.gridSize,
      canvasPalette: controller.presentation.canvasPalette,
      canvasGridVisible: controller.presentation.canvasGridVisible,
      canvasGridColor: controller.presentation.canvasGridColor,
      canvasSnapToGrid: controller.presentation.canvasSnapToGrid,
      viewport: controller.persistedViewport,
      frozenNodeIds: controller.frozenNodeIds,
    },
    chromeState: {
      canvasAuthoringMode: 'dbt',
      routeState: controller.query.isPending
        ? 'loading_graph'
        : controller.query.isError
          ? 'error_graph'
          : controller.canonicalNodes.length === 0
            ? 'empty'
            : 'ready',
      draftStatusState: {
        label: 'File-authoritative dbt project',
        tone: 'neutral',
        showReloadAction: false,
      },
      canPlanGraph: controller.execution.canPlanGraph,
      canStartRun: controller.execution.canStartRun,
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
      planStatusSummary: controller.execution.planStatusSummary,
      planRunReadiness: controller.execution.planRunReadiness,
      executionSelectionRecovery: controller.executionSelectionRecovery,
      exclusiveOverlayMode: 'runtime',
      canUseCostOverlay: false,
      impactOverlayEnabled: controller.presentation.impactOverlayEnabled,
      columnLevelLineageEnabled: controller.presentation.columnLevelLineageEnabled,
      transformationValidation: controller.transformationValidation,
    },
    graphCommands: controller.graphCommands,
    chromeCommands: controller.chromeCommands,
    canvasCommands: controller.canvasCommands,
    runControls,
    workspaceCommands: {
      canOpenProjectExplorer: false,
      onOpenProjectCode: () => {
        void controller.openProjectCode();
      },
    },
    canvasContextScreenToFlowPosition: screenToFlowPosition,
    sourceImportInitialSelection,
    onSourceImportInitialSelectionConsumed,
    onDbtProjectImported,
  };

  const modalHostProps: CanvasModalHostProps = {
    planPreview: {
      open: controller.execution.planModalOpen,
      plan: controller.currentPlan,
      outcome: controller.execution.latestPreviewOutcome,
      canStartRun: controller.execution.canStartRun,
      planStatusSummary: controller.execution.planStatusSummary,
      onClose: () => controller.execution.setPlanModalOpen(false),
      onStartRun: () => {
        void controller.execution.handleStartRun();
      },
    },
  };

  return { shellProps, modalHostProps };
}
