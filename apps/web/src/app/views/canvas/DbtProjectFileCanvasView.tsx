/** Owned concern: present the read-only file-authoritative dbt Canvas surface. */
import { lazy, Suspense, type ReactNode } from 'react';

import { cn } from '../../components/ui/utils';
import { dbtProjectFileCanvasSurfaceStrategy } from '../../plugins/dbt/dbtProjectFileCanvasSurfaceStrategy';
import type { CanvasShellProps } from './canvasShell.types';
import CanvasShell from './CanvasShell';
import { CanvasErrorStateView, CanvasLoadingStateView } from './CanvasStateViews';
import type { useDbtProjectFileCanvasController } from './useDbtProjectFileCanvasController';

const CodeView = lazy(() => import('../CodeView'));

type DbtProjectFileCanvasController = ReturnType<typeof useDbtProjectFileCanvasController>;

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
}: Readonly<{
  controller: DbtProjectFileCanvasController;
  screenToFlowPosition: NonNullable<CanvasShellProps['canvasContextScreenToFlowPosition']>;
}>): JSX.Element {
  const projectRoot = controller.authorityBinding.authority.projectRoot;
  const projectTitle = resolveProjectTitle(projectRoot);
  const activeCanvas = {
    id: controller.authorityBinding.canvasId,
    kind: 'dbt',
    title: projectTitle,
    defaultPermission: 'read' as const,
  };
  const centerSurface = resolveCenterSurface(controller);
  const contextualWorkbench =
    controller.projectCodeWorkbench == null
      ? undefined
      : {
          id: 'project-code' as const,
          title: 'Project code',
          description: projectRoot,
          onClose: controller.closeProjectCode,
          panel: (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
                  Loading project code...
                </div>
              }
            >
              <CodeView
                publishRouteBootstrap={false}
                fileScope={{
                  kind: 'dbt-project-files',
                  projectRoot,
                  ...(controller.projectCodeWorkbench.initialPath == null
                    ? {}
                    : { initialPath: controller.projectCodeWorkbench.initialPath }),
                }}
              />
            </Suspense>
          ),
        };
  const shellProps: CanvasShellProps = {
    layout: {
      focusMode: controller.presentation.focusMode,
      inspectorPanelVisible: controller.presentation.inspectorPanelVisible,
      canOpenSourceImport: false,
      canMoveNodes: true,
      canSelectNodes: true,
      surfaceStrategy: dbtProjectFileCanvasSurfaceStrategy,
      contextualWorkbench,
      centerSurfaceMode: 'replace',
      centerSurface,
      readOnlyBanner: <DbtProjectProjectionNotice controller={controller} />,
    },
    panels: {
      authoringNodeKinds: [],
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
      activeRunId: null,
      registeredPlugins: controller.registeredPlugins,
      userPermissions: {
        canPlan: false,
        canRun: false,
        canEditEdges: false,
      },
      importedNodeFocusIds: [],
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
      canvasEmptyStateGuideVisible: false,
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
      canPlanGraph: false,
      canStartRun: false,
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
      planStatusSummary: 'Preview and Run are outside the read-only file projection phase.',
      planRunReadiness: controller.planRunReadiness,
      exclusiveOverlayMode: 'runtime',
      canUseCostOverlay: false,
      impactOverlayEnabled: controller.presentation.impactOverlayEnabled,
      columnLevelLineageEnabled: controller.presentation.columnLevelLineageEnabled,
      transformationValidation: controller.transformationValidation,
    },
    graphCommands: controller.graphCommands,
    chromeCommands: controller.chromeCommands,
    canvasCommands: controller.canvasCommands,
    workspaceCommands: {
      canOpenProjectExplorer: false,
      onOpenProjectCode: controller.openProjectCode,
    },
    canvasContextScreenToFlowPosition: screenToFlowPosition,
  };

  return <CanvasShell {...shellProps} />;
}
