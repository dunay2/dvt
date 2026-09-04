/** Owned concern: present the read-only file-authoritative dbt Canvas surface. */
import { useRef, type ReactNode } from 'react';
import { cn } from '../../components/ui/utils';
import { dbtProjectFileCanvasSurfaceStrategy } from '../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy';
import { DBT_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import type { CanvasShellProps } from './canvasShell.types';
import CanvasShell from './CanvasShell';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasErrorStateView, CanvasLoadingStateView } from './CanvasStateViews';
import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import type { SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import { buildDbtYamlDescriptionWorkbenchContributions } from './dbtYamlDescriptionWorkbenchContribution';
import { buildDbtWorkspaceFileCodeContributions } from './dbtWorkspaceFileCodeContribution';
import { buildDbtExecutionTargetWorkbenchContributions } from './dbtExecutionTargetWorkbenchContribution';
import { useCanvasRunControlSurface } from './useCanvasRunControlSurface';
import type { useDbtProjectFileCanvasController } from './useDbtProjectFileCanvasController';

type DbtProjectFileCanvasController = ReturnType<typeof useDbtProjectFileCanvasController>;
const FILE_AUTHORITY_SOURCE_IMPORT_KINDS = DBT_NODE_KINDS.filter(
  (registration) => registration.kind === 'dbt:source'
);

function unsupportedFileProjectionCommand(commandName: string): never {
  throw new Error(`${commandName} is unavailable in the read-only dbt project file projection.`);
}

function resolveProjectTitle(projectRoot: string): string {
  const pathSegments = projectRoot.split(/[\\/]/).filter((segment) => segment.length > 0);
  return pathSegments.at(-1) ?? projectRoot;
}

function DbtProjectProjectionNotice({
  controller,
}: Readonly<{ controller: DbtProjectFileCanvasController }>): JSX.Element | null {
  const source = controller.query.data;
  if (source == null) {
    return null;
  }

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

function resolveCenterSurface(controller: DbtProjectFileCanvasController): ReactNode | undefined {
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

export function DbtProjectFileCanvasView({
  controller,
  screenToFlowPosition,
  onDbtProjectImported,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
}: Readonly<{
  controller: DbtProjectFileCanvasController;
  screenToFlowPosition: NonNullable<CanvasShellProps['canvasContextScreenToFlowPosition']>;
  onDbtProjectImported: NonNullable<CanvasShellProps['onDbtProjectImported']>;
  sourceImportInitialSelection?: CanvasShellProps['sourceImportInitialSelection'];
  onSourceImportInitialSelectionConsumed?: CanvasShellProps['onSourceImportInitialSelectionConsumed'];
}>): JSX.Element {
  const codeWorkbenchRef = useRef<SqlContextWorkbenchHandle>(null);
  const runControls = useCanvasRunControlSurface(
    controller.workspaceLayoutKey,
    controller.activeRunId
  );
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const projectRoot = controller.authorityBinding.authority.projectRoot;
  const projectTitle = resolveProjectTitle(projectRoot);
  const activeCanvas = {
    id: controller.authorityBinding.canvasId,
    kind: 'dbt',
    title: projectTitle,
    defaultPermission: 'read' as const,
  };
  const centerSurface = resolveCenterSurface(controller);
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
      surfaceStrategy: dbtProjectFileCanvasSurfaceStrategy,
      contextualWorkbench,
      centerSurface,
      readOnlyBanner: <DbtProjectProjectionNotice controller={controller} />,
    },
    panels: {
      authoringNodeKinds: FILE_AUTHORITY_SOURCE_IMPORT_KINDS,
      activeCanvasId: activeCanvas.id,
      activeCanvas,
      canvasDocuments: [activeCanvas],
      executionEnvironmentOptions: [],
      canEditCanvas: false,
      canDeleteActiveCanvas: false,
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

  return <CanvasShell {...shellProps} />;
}
