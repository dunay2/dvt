/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasContextMenuLayer } from './CanvasContextMenuLayer';
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

function resolveWorkspaceFilePath(data: DbtNodeData): string | null {
  const codeTruth = data.presentationTruth?.code;
  return codeTruth?.kind === 'workspace-file' ? codeTruth.path : null;
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
  onDbtProjectImported,
}: CanvasShellProps): JSX.Element {
  const copy = resolveCanvasViewCopy();
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
        }
        return flushed;
      },
      panel: (
        <SqlContextWorkbench
          ref={codeWorkbenchRef}
          loadingMessage={copy.sqlContextWorkbenchLoadingMessage}
          initialPath={isNodeCode ? graphDraftCodeTarget.path : undefined}
        />
      ),
    };
  }, [
    scopedContextualWorkbenchId,
    graphDraftCodeTarget,
    copy.nodeWorkbenchCloseLabel,
    copy.sqlContextWorkbenchLoadingMessage,
    copy.sqlContextWorkbenchMoveLabel,
    copy.sqlContextWorkbenchProjectDescription,
    copy.sqlContextWorkbenchNodeTitle,
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
  const graphWithCanonicalCodeCommands = useMemo(
    () => ({
      ...graph,
      nodesWithImpact: graph.nodesWithImpact.map((node) => {
        const data = node.data as DbtNodeData;
        const existingOpenNodeCode = data.onOpenNodeCode;
        const workspaceFilePath = resolveWorkspaceFilePath(data);
        const canOpenNodeCode =
          data.canOpenNodeCode === true
            ? typeof existingOpenNodeCode === 'function'
            : workspaceFilePath != null;

        return {
          ...node,
          data: {
            ...data,
            canOpenNodeCode,
            onOpenNodeCode: canOpenNodeCode
              ? (nodeId: string) => {
                  captureWorkbenchOpener(undefined, nodeId);
                  if (typeof existingOpenNodeCode === 'function') {
                    existingOpenNodeCode(nodeId);
                    return;
                  }
                  if (workspaceFilePath != null) {
                    openGraphDraftNodeCodeWorkbench({
                      nodeId,
                      nodeName: data.name,
                      path: workspaceFilePath,
                    });
                  }
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
      <CanvasContextMenuLayer presenter={contextMenuPresenter} />

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
        canvasGridVisible={graph.canvasGridVisible}
        canvasGridColor={graph.canvasGridColor}
        canvasSnapToGrid={graph.canvasSnapToGrid}
        canvasEmptyStateGuideVisible={graph.canvasEmptyStateGuideVisible}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
        onSetCanvasEmptyStateGuideVisible={chromeCommands.onSetCanvasEmptyStateGuideVisible}
        onRestoreFocus={contextMenuPresenter.restoreContextMenuOpenerFocus}
        onClose={() => setCanvasSettingsOpen(false)}
      />
      <DbtProjectImportDialog
        open={dbtProjectImportOpen}
        onClose={() => setDbtProjectImportOpen(false)}
        onImported={(result) => {
          setDbtProjectImportOpen(false);
          onDbtProjectImported?.(result);
        }}
      />
    </ResizablePanelGroup>
  );
}
