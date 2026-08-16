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
import type { CanvasShellContextualWorkbench, CanvasShellProps } from './canvasShell.types';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { SqlContextWorkbench, type SqlContextWorkbenchHandle } from './SqlContextWorkbench';
import { useCanvasRouteIntentHandler } from './useCanvasRouteIntentHandler';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

type GraphDraftCodeTarget = Readonly<{
  nodeId: string;
  nodeName: string;
  path: string;
}>;

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
  routeIntentRequest,
  canvasContextScreenToFlowPosition,
  sourceImportInitialSelection,
  onSourceImportInitialSelectionConsumed,
  onDbtProjectImported,
}: CanvasShellProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const [graphDraftCodeTarget, setGraphDraftCodeTarget] = useState<GraphDraftCodeTarget | null>(
    null
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
      setGraphDraftCodeTarget(null);
      openContextualWorkbench('project-code', activeContextualWorkbenchOwnerKey);
    }
  }, [activeContextualWorkbenchOwnerKey, openContextualWorkbench]);
  const openGraphDraftNodeCodeWorkbench = useCallback(
    (target: GraphDraftCodeTarget) => {
      if (activeContextualWorkbenchOwnerKey == null) {
        return;
      }

      setGraphDraftCodeTarget(target);
      chromeCommands.onHideInspector();
      openContextualWorkbench('node-code', activeContextualWorkbenchOwnerKey);
    },
    [activeContextualWorkbenchOwnerKey, chromeCommands, openContextualWorkbench]
  );
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
  useEffect(() => {
    if (!sourceImportDialog.open || sourceImportInitialSelection == null) {
      return;
    }
    onSourceImportInitialSelectionConsumed?.();
  }, [
    onSourceImportInitialSelectionConsumed,
    sourceImportDialog.open,
    sourceImportInitialSelection,
  ]);
  useEffect(() => {
    if (contextualWorkbenchId != null && scopedContextualWorkbenchId == null) {
      closeContextualWorkbench();
      setGraphDraftCodeTarget(null);
    }
  }, [closeContextualWorkbench, contextualWorkbenchId, scopedContextualWorkbenchId]);
  const internalContextualWorkbench = useMemo<CanvasShellContextualWorkbench | undefined>(() => {
    const isProjectCode = scopedContextualWorkbenchId === 'project-code';
    const isNodeCode = scopedContextualWorkbenchId === 'node-code' && graphDraftCodeTarget != null;
    if (!isProjectCode && !isNodeCode) {
      return undefined;
    }

    return {
      id: isNodeCode ? 'node-code' : 'project-code',
      title: isNodeCode ? copy.sqlContextWorkbenchNodeTitle : copy.sqlContextWorkbenchProjectTitle,
      closeLabel: copy.nodeWorkbenchCloseLabel,
      moveLabel: copy.sqlContextWorkbenchMoveLabel,
      description: isNodeCode
        ? graphDraftCodeTarget.path
        : copy.sqlContextWorkbenchProjectDescription,
      requestClose: async () => {
        const flushed = (await codeWorkbenchRef.current?.flush()) ?? true;
        if (flushed) {
          closeContextualWorkbench();
          setGraphDraftCodeTarget(null);
          if (isNodeCode) {
            chromeCommands.onShowInspector();
          }
        }
        return flushed;
      },
      panel: (
        <SqlContextWorkbench
          ref={codeWorkbenchRef}
          initialPath={isNodeCode ? graphDraftCodeTarget.path : undefined}
        />
      ),
    };
  }, [
    scopedContextualWorkbenchId,
    graphDraftCodeTarget,
    copy.nodeWorkbenchCloseLabel,
    copy.sqlContextWorkbenchMoveLabel,
    copy.sqlContextWorkbenchProjectDescription,
    copy.sqlContextWorkbenchNodeTitle,
    copy.sqlContextWorkbenchProjectTitle,
    chromeCommands,
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
  const graphWithCanonicalCodeCommands = useMemo(
    () => ({
      ...graph,
      nodesWithImpact: graph.nodesWithImpact.map((node) => {
        const data = node.data as DbtNodeData;
        const existingOpenNodeCode = data.onOpenNodeCode;
        const workspaceFilePath = resolveWorkspaceFilePath(data);
        const codeTruthKind = data.presentationTruth?.code.kind;
        const canInspectNodeCode =
          typeof data.onInspectNode === 'function' &&
          (data.pluginKind === 'dbt:model' ||
            codeTruthKind === 'inline' ||
            codeTruthKind === 'generated');
        const fallbackOpenNodeCode =
          workspaceFilePath != null
            ? (nodeId: string) => {
                openGraphDraftNodeCodeWorkbench({
                  nodeId,
                  nodeName: data.name,
                  path: workspaceFilePath,
                });
              }
            : canInspectNodeCode
              ? (nodeId: string) => data.onInspectNode?.(nodeId, 'code')
              : undefined;
        const openNodeCode =
          data.canOpenNodeCode === true
            ? existingOpenNodeCode
            : data.canOpenNodeCode === false
              ? undefined
              : (existingOpenNodeCode ?? fallbackOpenNodeCode);
        const canOpenNodeCode = typeof openNodeCode === 'function';

        return {
          ...node,
          data: {
            ...data,
            canOpenNodeCode,
            onOpenNodeCode: canOpenNodeCode
              ? (nodeId: string) => {
                  captureWorkbenchOpener(undefined, nodeId);
                  openNodeCode?.(nodeId);
                }
              : undefined,
          },
        };
      }),
    }),
    [captureWorkbenchOpener, graph, openGraphDraftNodeCodeWorkbench]
  );
  useCanvasRouteIntentHandler({
    request: routeIntentRequest ?? null,
    columnLevelLineageEnabled: chromeState.columnLevelLineageEnabled,
    canOpenProjectCode: activeContextualWorkbenchOwnerKey != null,
    onOpenProjectCode,
    onToggleColumnLevelLineage: chromeCommands.onToggleColumns,
  });
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
        />
      )}
      <CanvasShellMainPanel
        layout={shellLayout}
        panels={panels}
        graph={graphWithCanonicalCodeCommands}
        chromeState={chromeState}
        graphCommands={graphCommands}
        chromeCommands={chromeCommands}
        onOpenSourceImport={sourceImportDialog.openCommand}
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
          onComplete={graphCommands.onSourceImportComplete}
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
