/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { CanvasProjectExplorerDialog } from './CanvasProjectExplorerDialog';
import { CanvasSettingsDialog } from './CanvasSettingsDialog';
import { CanvasSourceImportDialogHost } from './CanvasSourceImportDialogHost';
import { DbtProjectImportDialog } from '../../components/dbtProjectImport/DbtProjectImportDialog';
import { useCanvasSourceImportDialogState } from './useCanvasSourceImportDialogState';
import { useCanvasContextMenuPresenter } from './useCanvasContextMenuPresenter';
import type {
  CanvasShellContextualWorkbench,
  CanvasShellOpenDataRegistryCommand,
  CanvasShellProps,
} from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { buildGraphDraftWorkspaceFileCodeContributions } from './graphDraftWorkspaceFileCodeContribution';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import type { SourceDataSample } from '../../ports/workspace';
import {
  CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
  resolveCanvasSinkDataSampleTarget,
  resolveCanvasSourceDataSampleError,
  resolveCanvasSourceDataSampleTarget,
  type CanvasSinkDataSampleTarget,
  type CanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';

type WorkbenchOpener = Readonly<{
  element: HTMLElement | null;
  fallbackSelector?: string;
  fallbackNodeId?: string;
}>;

export function resolveWorkspaceFilePath(data: DbtNodeData): string | null {
  const codeTruth = data.presentationTruth?.code;
  if (codeTruth?.kind === 'workspace-file') {
    return codeTruth.path;
  }

  if (typeof data.path === 'string' && data.path.trim().length > 0) {
    return data.path;
  }

  return null;
}

export default function CanvasShell({
  layout,
  panels,
  graph,
  chromeState,
  graphCommands,
  chromeCommands,
  canvasCommands,
  runControls,
  workspaceCommands,
  canvasContextScreenToFlowPosition,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
  onDbtProjectImported,
  warehouseSourceDataSampleQuery,
  runSnapshot,
  runMaterializationSampleQuery,
}: CanvasShellProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const [dataSample, setDataSample] = useState<OperationalDrawerDataSample>({ status: 'idle' });
  const dataSampleRequestIdRef = useRef(0);
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const selectOperationalDrawerTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const workbenchOpenerRef = useRef<WorkbenchOpener | null>(null);
  const contextualWorkbenchId = useCanvasInteractionStore((state) => state.contextualWorkbenchId);
  const contextualWorkbenchOwnerKey = useCanvasInteractionStore(
    (state) => state.contextualWorkbenchOwnerKey
  );
  const openContextualWorkbench = useCanvasInteractionStore(
    (state) => state.openContextualWorkbench
  );
  const closeContextualWorkbench = useCanvasInteractionStore(
    (state) => state.closeContextualWorkbench
  );
  const activeContextualWorkbenchOwnerKey =
    layout.surfaceStrategy == null || panels.activeCanvasId == null
      ? null
      : `${layout.surfaceStrategy.id}:${panels.activeCanvasId}`;
  const scopedContextualWorkbenchId =
    contextualWorkbenchOwnerKey === activeContextualWorkbenchOwnerKey
      ? contextualWorkbenchId
      : null;
  const codeWorkbenchRef = useRef<SqlContextWorkbenchHandle>(null);
  const captureWorkbenchOpener = useCallback(
    (fallbackSelector?: string, fallbackNodeId?: string) => {
      workbenchOpenerRef.current = {
        element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        ...(fallbackSelector == null ? {} : { fallbackSelector }),
        ...(fallbackNodeId == null ? {} : { fallbackNodeId }),
      };
    },
    []
  );
  const restoreWorkbenchFocus = useCallback(() => {
    const opener = workbenchOpenerRef.current;
    workbenchOpenerRef.current = null;
    window.requestAnimationFrame(() => {
      const fallbackNode =
        opener?.fallbackNodeId == null
          ? null
          : (Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node')).find(
              (node) => node.dataset.id === opener.fallbackNodeId
            ) ?? null);
      const target =
        opener?.element?.isConnected === true
          ? opener.element
          : (fallbackNode ??
            (opener?.fallbackSelector == null
              ? null
              : document.querySelector<HTMLElement>(opener.fallbackSelector)));
      target?.focus({ preventScroll: true });
    });
  }, []);
  const openProjectCodeWorkbench = useCallback(() => {
    if (activeContextualWorkbenchOwnerKey != null) {
      openContextualWorkbench('project-code', activeContextualWorkbenchOwnerKey);
    }
  }, [activeContextualWorkbenchOwnerKey, openContextualWorkbench]);
  const openProjectExplorer = useCallback(() => setProjectExplorerOpen(true), []);
  const restoreProjectExplorerFocus = useCallback(() => {
    document
      .querySelector<HTMLButtonElement>('[data-slot="shell-workspace-menu-trigger"]')
      ?.focus({ preventScroll: true });
  }, []);
  const openDbtProjectImport = useCallback(() => setDbtProjectImportOpen(true), []);
  const openCanvasSettings = useCallback(() => setCanvasSettingsOpen(true), []);
  const canEditGraph = panels.userPermissions.canEditEdges;
  const sourceImportContributions = useMemo(
    () => getSourceImportContributions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const sourceImportOptions = useMemo(
    () => getSourceImportOptions(panels.runtimeCapabilities),
    [panels.runtimeCapabilities]
  );
  const canBrowseDataRegistry = layout.canOpenSourceImport && sourceImportContributions.length > 0;
  const canOpenDataRegistry = canBrowseDataRegistry;
  const sourceImportDialog = useCanvasSourceImportDialogState(canOpenDataRegistry);
  useEffect(() => {
    if (sourceImportInitialSelection == null || sourceImportDialog.openCommand == null) {
      return;
    }
    sourceImportDialog.openCommand(sourceImportInitialSelection);
  }, [sourceImportDialog.openCommand, sourceImportInitialSelection]);
  const openSourceImport = useMemo<CanvasShellOpenDataRegistryCommand | undefined>(() => {
    const openCommand = sourceImportDialog.openCommand;
    return openCommand == null
      ? undefined
      : (initialSelection, placement) =>
          openCommand(initialSelection ?? sourceImportInitialSelection, placement);
  }, [sourceImportDialog.openCommand, sourceImportInitialSelection]);
  useEffect(() => {
    if (contextualWorkbenchId != null && scopedContextualWorkbenchId == null) {
      closeContextualWorkbench();
    }
  }, [closeContextualWorkbench, contextualWorkbenchId, scopedContextualWorkbenchId]);
  const internalContextualWorkbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
    if (scopedContextualWorkbenchId !== 'project-code') {
      return undefined;
    }

    return {
      id: 'project-code',
      title: copy.sqlContextWorkbenchProjectTitle,
      closeLabel: copy.nodeWorkbenchCloseLabel,
      moveLabel: copy.sqlContextWorkbenchMoveLabel,
      description: copy.sqlContextWorkbenchProjectDescription,
      requestClose: async () => {
        const flushed = (await codeWorkbenchRef.current?.flush()) ?? true;
        if (flushed) {
          closeContextualWorkbench();
        }
        return flushed;
      },
      panel: <SqlContextWorkbench ref={codeWorkbenchRef} />,
    };
  }, [
    scopedContextualWorkbenchId,
    copy.nodeWorkbenchCloseLabel,
    copy.sqlContextWorkbenchMoveLabel,
    copy.sqlContextWorkbenchProjectDescription,
    copy.sqlContextWorkbenchProjectTitle,
    closeContextualWorkbench,
  ]);
  const selectedContextualWorkbench = layout.contextualWorkbench ?? internalContextualWorkbench;
  const shellLayout = useMemo(() => {
    if (selectedContextualWorkbench == null) {
      return layout;
    }

    return {
      ...layout,
      contextualWorkbench: {
        ...selectedContextualWorkbench,
        requestClose: async () => {
          const closed = await selectedContextualWorkbench.requestClose();
          if (closed) {
            restoreWorkbenchFocus();
          }
          return closed;
        },
      },
    };
  }, [layout, restoreWorkbenchFocus, selectedContextualWorkbench]);
  const onOpenProjectCode = useCallback(() => {
    captureWorkbenchOpener('[data-slot="shell-workspace-menu-trigger"]');
    (workspaceCommands?.onOpenProjectCode ?? openProjectCodeWorkbench)();
  }, [captureWorkbenchOpener, openProjectCodeWorkbench, workspaceCommands?.onOpenProjectCode]);
  const openDataSample = useCallback(
    (nodeName: string, load: () => Promise<SourceDataSample>) => {
      const requestId = ++dataSampleRequestIdRef.current;
      setDataSample({ status: 'loading', nodeName });
      selectOperationalDrawerTab('data');
      showBottomDrawer(300);
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(
            '[data-slot="bottom-operational-drawer-tab"][data-tab="data"]'
          )
          ?.focus({ preventScroll: true });
      });

      void load()
        .then((sample) => {
          if (dataSampleRequestIdRef.current === requestId) {
            setDataSample({ status: 'ready', nodeName, sample });
          }
        })
        .catch((error: unknown) => {
          if (dataSampleRequestIdRef.current === requestId) {
            setDataSample(resolveCanvasSourceDataSampleError(error, nodeName));
          }
        });
    },
    [selectOperationalDrawerTab, showBottomDrawer]
  );
  const openSourceDataSample = useCallback(
    (target: CanvasSourceDataSampleTarget) => {
      if (warehouseSourceDataSampleQuery == null) {
        return;
      }

      openDataSample(target.nodeName, () =>
        warehouseSourceDataSampleQuery.previewSourceObjectRows({
          connectionId: target.connectionId,
          objectId: target.objectId,
          limit: CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
        })
      );
    },
    [openDataSample, warehouseSourceDataSampleQuery]
  );
  const openSinkDataSample = useCallback(
    (target: CanvasSinkDataSampleTarget) => {
      if (runMaterializationSampleQuery == null) {
        return;
      }

      openDataSample(target.nodeName, () =>
        runMaterializationSampleQuery(target.runId, CANVAS_SOURCE_DATA_SAMPLE_LIMIT)
      );
    },
    [openDataSample, runMaterializationSampleQuery]
  );
  useEffect(
    () => () => {
      dataSampleRequestIdRef.current += 1;
    },
    []
  );
  const graphWithCanonicalCodeCommands = useMemo(
    () => ({
      ...graph,
      nodesWithImpact: graph.nodesWithImpact.map((node) => {
        const data = node.data as DbtNodeData;
        const workspaceFilePath = resolveWorkspaceFilePath(data);
        const codeTruthKind = data.presentationTruth?.code.kind;
        const canInspectNodeCode =
          typeof data.onInspectNode === 'function' &&
          (workspaceFilePath != null ||
            data.pluginKind === 'dbt:model' ||
            codeTruthKind === 'inline' ||
            codeTruthKind === 'generated');
        const canOpenNodeCode = data.canOpenNodeCode !== false && canInspectNodeCode;
        const sourceDataSampleTarget = resolveCanvasSourceDataSampleTarget(data);
        const sinkDataSampleTarget = resolveCanvasSinkDataSampleTarget(data, runSnapshot);
        const canOpenSourceDataSample =
          sourceDataSampleTarget != null && warehouseSourceDataSampleQuery != null;
        const canOpenSinkDataSample =
          sinkDataSampleTarget != null && runMaterializationSampleQuery != null;
        const canOpenDataSample = canOpenSourceDataSample || canOpenSinkDataSample;
        const runStatusByNodeId =
          sinkDataSampleTarget == null
            ? data.runStatusByNodeId
            : new Map(data.runStatusByNodeId).set(node.id, sinkDataSampleTarget.status);

        return {
          ...node,
          data: {
            ...data,
            canOpenNodeCode,
            ...(sinkDataSampleTarget == null
              ? {}
              : {
                  rows: sinkDataSampleTarget.rowsWritten,
                  durationMs: sinkDataSampleTarget.durationMs,
                  lastRunAt: sinkDataSampleTarget.completedAt,
                  runStatusByNodeId,
                }),
            onOpenSourceDataSample: canOpenSourceDataSample
              ? () => openSourceDataSample(sourceDataSampleTarget)
              : canOpenSinkDataSample
                ? () => openSinkDataSample(sinkDataSampleTarget)
                : undefined,
            sourceDataSampleInteractionLabel: canOpenDataSample
              ? copy.sourceDataSampleInteractionLabel
              : undefined,
          },
        };
      }),
    }),
    [
      copy.sourceDataSampleInteractionLabel,
      graph,
      openSinkDataSample,
      openSourceDataSample,
      runMaterializationSampleQuery,
      runSnapshot,
      warehouseSourceDataSampleQuery,
    ]
  );
  const graphOwnedPaths = useMemo(
    () =>
      new Set(
        graphWithCanonicalCodeCommands.nodesWithImpact.flatMap((node) => {
          const path = resolveWorkspaceFilePath(node.data as DbtNodeData);
          return path == null ? [] : [path];
        })
      ),
    [graphWithCanonicalCodeCommands.nodesWithImpact]
  );
  const inspectorWorkspaceFilePath =
    panels.inspectorNode == null
      ? null
      : resolveWorkspaceFilePath(panels.inspectorNode as unknown as DbtNodeData);
  const hasRouteOwnedCodeContribution = panels.inspectorWorkbenchContributions.some(
    (contribution) =>
      contribution.nodeId === panels.inspectorNode?.id && contribution.sectionId === 'code'
  );
  const panelsWithCanonicalCodeContribution = useMemo(
    () => ({
      ...panels,
      inspectorWorkbenchContributions: hasRouteOwnedCodeContribution
        ? panels.inspectorWorkbenchContributions
        : [
            ...panels.inspectorWorkbenchContributions,
            ...buildGraphDraftWorkspaceFileCodeContributions({
              node: panels.inspectorNode,
              path: inspectorWorkspaceFilePath,
              graphOwnedPaths,
            }),
          ],
    }),
    [graphOwnedPaths, hasRouteOwnedCodeContribution, inspectorWorkspaceFilePath, panels]
  );
  const onOpenProjectExplorer =
    workspaceCommands?.canOpenProjectExplorer === false ? undefined : openProjectExplorer;
  const contextMenuPresenter = useCanvasContextMenuPresenter({
    canEditEdges: canEditGraph,
    canOpenSourceImport: canOpenDataRegistry,
    canOpenCanvasSettings: true,
    authoringNodeKinds: panels.authoringNodeKinds,
    screenToFlowPosition: canvasContextScreenToFlowPosition ?? ((screenPosition) => screenPosition),
    onCreateAuthoringNode: graphCommands.onCreateAuthoringNode,
    onEdgesChange: graphCommands.onEdgesChange,
    onOpenSourceImport:
      sourceImportDialog.openCommand == null
        ? undefined
        : (flowPosition) =>
            sourceImportDialog.openCommand?.(
              undefined,
              flowPosition == null ? undefined : { canvasPosition: flowPosition }
            ),
    onOpenCanvasSettings: openCanvasSettings,
  });

  return (
    <ResizablePanelGroup
      data-slot="canvas-shell-panel-group"
      id="canvas-shell-horizontal-panels"
      direction="horizontal"
      className="h-full min-w-0"
    >
      {layout.surfaceStrategy?.operationalDrawer == null ? null : (
        <CanvasOperationalDrawerContributionRegistrar
          policy={layout.surfaceStrategy.operationalDrawer}
          panels={panels}
          chromeState={chromeState}
          runControls={runControls}
          onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
          onStartRun={chromeCommands.onRun}
          selectionRecoveryCommands={chromeCommands.executionSelectionRecovery}
          dataSample={dataSample}
        />
      )}
      <CanvasShellMainPanel
        layout={shellLayout}
        panels={panelsWithCanonicalCodeContribution}
        graph={graphWithCanonicalCodeCommands}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={openSourceImport}
        onOpenProjectExplorer={onOpenProjectExplorer}
        onOpenProjectCode={onOpenProjectCode}
        onImportDbtProject={onDbtProjectImported == null ? undefined : openDbtProjectImport}
        onOpenCanvasSettings={openCanvasSettings}
        contextMenuPresenter={contextMenuPresenter}
      />
      {panels.activeCanvasId != null ? (
        <CanvasSourceImportDialogHost
          open={sourceImportDialog.open}
          canvasId={panels.activeCanvasId}
          onClose={sourceImportDialog.close}
          onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
          onComplete={(result, placement) => {
            graphCommands.onSourceImportComplete(result, placement);
            if (sourceImportInitialSelection?.kind === 'dbt-source-binding') {
              onSourceImportInitialSelectionConsumed?.();
            }
          }}
          sourceImportOptions={sourceImportOptions}
          initialSelection={sourceImportDialog.initialSelection}
          placement={sourceImportDialog.placement}
        />
      ) : null}
      <CanvasProjectExplorerDialog
        open={projectExplorerOpen}
        activeCanvasId={panels.activeCanvasId}
        canvasDocuments={panels.canvasDocuments}
        onSelectCanvas={canvasCommands.onSelectCanvas}
        onClose={() => setProjectExplorerOpen(false)}
        onRestoreFocus={restoreProjectExplorerFocus}
      />
      <CanvasSettingsDialog
        open={canvasSettingsOpen}
        impactOverlayEnabled={chromeState.impactOverlayEnabled}
        columnLevelLineageEnabled={chromeState.columnLevelLineageEnabled}
        canUseCostOverlay={chromeState.canUseCostOverlay}
        costOverlayEnabled={chromeState.exclusiveOverlayMode === 'cost'}
        gridSize={graph.gridSize}
        canvasPalette={graph.canvasPalette}
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canvasEmptyStateGuideVisible={graph.canvasEmptyStateGuideVisible}
        canAutoLayout={panels.userPermissions.canEditEdges}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onGridSizeChange={chromeCommands.onGridSizeChange}
        onCanvasPaletteChange={chromeCommands.onCanvasPaletteChange}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onSetCanvasEmptyStateGuideVisible={chromeCommands.onSetCanvasEmptyStateGuideVisible}
        onAutoLayout={chromeCommands.onAutoLayout}
        onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
        onClose={() => setCanvasSettingsOpen(false)}
      />
      <DbtProjectImportDialog
        open={dbtProjectImportOpen}
        onClose={() => setDbtProjectImportOpen(false)}
        onRestoreFocus={restoreProjectExplorerFocus}
        onImported={(result, sourceTableDeclarations) => {
          setDbtProjectImportOpen(false);
          onDbtProjectImported?.(result, sourceTableDeclarations);
        }}
      />
    </ResizablePanelGroup>
  );
}
