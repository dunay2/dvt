/**
 * Owned concern: compose the Canvas shell from route-owned presentation contracts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSourceImportContributions, getSourceImportOptions } from '../../plugins/registry';
import { ResizablePanelGroup } from '../../components/ui/resizable';
import { CanvasShellMainPanel } from './CanvasShellMainPanel';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { canOpenCanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import { CanvasModelEditor, type CanvasModelView } from './CanvasModelEditor';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
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
import { findCanvasGraphNodeElement } from './canvasNodeWorkbenchDomGeometry';
import { useCanvasNodeDataSample } from './useCanvasNodeDataSample';
import { useCanvasOutputExpressionInspection } from './useCanvasOutputExpressionInspection';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerTab,
} from '../../components/shell/operationalDrawerContributionStore';

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
  canvasTransformDataSampleQuery,
  prepareModelPreview,
  runSnapshot,
  runMaterializationSampleQuery,
}: CanvasShellProps): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);
  const [projectExplorerOpen, setProjectExplorerOpen] = useState(false);
  const [canvasSettingsOpen, setCanvasSettingsOpen] = useState(false);
  const [dbtProjectImportOpen, setDbtProjectImportOpen] = useState(false);
  const { dataSampleTabs, projectNode: projectNodeDataSample } = useCanvasNodeDataSample({
    activeCanvasId: panels.activeCanvasId,
    canvasTransformDataSampleQuery,
    runMaterializationSampleQuery,
    runSnapshot,
    warehouseSourceDataSampleQuery,
  });
  const [relationalTreeTransformId, setRelationalTreeTransformId] = useState<string | null>(null);
  const outputInspection = useCanvasOutputExpressionInspection(
    panels.activeCanvasId,
    panels.inspectorGraphNodes
  );
  const [modelTabActive, setModelTabActive] = useState(true);
  const [operationDataHost, setOperationDataHost] = useState<HTMLDivElement | null>(null);
  const selectDrawerTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const openOperationData = useCallback(() => {
    selectDrawerTab('data:operation');
    const drawer = useUiLayoutStore.getState();
    showBottomDrawer(
      drawer.bottomDrawerVisible && drawer.bottomDrawerHeight >= 200
        ? drawer.bottomDrawerHeight
        : 260
    );
  }, [selectDrawerTab, showBottomDrawer]);
  const operationDataTab = useMemo<OperationalDrawerTab>(() => {
    const semanticCopy = resolveCanvasSemanticEditorCopy(applicationLanguage);
    return {
      id: 'data:operation',
      label: semanticCopy.operationData,
      count: null,
      content: (
        <div
          ref={setOperationDataHost}
          data-slot="canvas-operation-data-host"
          className="h-full min-h-0 min-w-0"
        >
          <p className="p-4 text-sm text-(--text-muted)">{semanticCopy.selectOperation}</p>
        </div>
      ),
    };
  }, [applicationLanguage]);
  const [initialModelView, setInitialModelView] = useState<CanvasModelView>('editor');
  const [modelViewRequestId, setModelViewRequestId] = useState(0);
  const relationalTreeTransformIds = useMemo(
    () =>
      new Set(
        panels.inspectorGraphNodes
          .filter(canOpenCanvasRelationalTreeWorkbench)
          .map((node) => node.id)
      ),
    [panels.inspectorGraphNodes]
  );
  const relationalTreeTransform = useMemo(
    () =>
      panels.inspectorGraphNodes.find(
        (node) => node.id === relationalTreeTransformId && relationalTreeTransformIds.has(node.id)
      ) ?? null,
    [panels.inspectorGraphNodes, relationalTreeTransformId, relationalTreeTransformIds]
  );
  const openRelationalTree = useCallback(
    (nodeId: string, view: CanvasModelView = 'editor') => {
      if (!relationalTreeTransformIds.has(nodeId)) return;
      workbenchOpenerRef.current = {
        element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        fallbackNodeId: nodeId,
      };
      const open = () => {
        setInitialModelView(view);
        setModelViewRequestId((current) => current + 1);
        setRelationalTreeTransformId(nodeId);
        setModelTabActive(true);
      };
      const current = useCanvasWorkspaceMenuContributionStore.getState().modelTab;
      if (current?.canvasId === panels.activeCanvasId && current.nodeId !== nodeId)
        current.onClose(open);
      else open();
    },
    [relationalTreeTransformIds, panels.activeCanvasId]
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
      const fallbackNode = findCanvasGraphNodeElement(opener?.fallbackNodeId ?? null);
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
  const graphWithCanonicalCodeCommands = useMemo(
    () => ({
      ...graph,
      nodesWithImpact: graph.nodesWithImpact.map((node) => {
        const data = node.data as DbtNodeData;
        const isNativeTransform = data.pluginKind === 'dvt:transform';
        const canOpenRelationalTree = relationalTreeTransformIds.has(node.id);
        const workspaceFilePath = resolveWorkspaceFilePath(data);
        const codeTruthKind = data.presentationTruth?.code.kind;
        const canInspectNodeCode =
          typeof data.onInspectNode === 'function' &&
          (workspaceFilePath != null ||
            codeTruthKind === 'inline' ||
            codeTruthKind === 'generated' ||
            codeTruthKind === 'canonical');
        const canOpenNodeCode = data.canOpenNodeCode !== false && canInspectNodeCode;
        const dataSampleProjection = projectNodeDataSample(node.id, data);
        const sinkDataSampleTarget = dataSampleProjection.sinkResult;
        const participatesInActiveRun = data.runStatusByNodeId?.has(node.id) === true;
        const activeRunAt =
          runSnapshot?.completedAt ?? runSnapshot?.startedAt ?? runSnapshot?.createdAt;
        const runStatusByNodeId =
          sinkDataSampleTarget == null
            ? data.runStatusByNodeId
            : new Map(data.runStatusByNodeId).set(node.id, sinkDataSampleTarget.status);
        const projectedData: DbtNodeData = {
          ...data,
          dataActionLabel: dataSampleProjection.canOpen
            ? resolveCanvasSemanticEditorCopy(applicationLanguage).execute
            : undefined,
          canOpenNodeCode,
          ...(participatesInActiveRun
            ? {
                ...(activeRunAt == null ? {} : { lastRunAt: activeRunAt }),
                ...(runSnapshot?.durationMs == null ? {} : { durationMs: runSnapshot.durationMs }),
              }
            : {}),
          ...(sinkDataSampleTarget == null
            ? {}
            : {
                rows: sinkDataSampleTarget.rowsWritten,
                durationMs: sinkDataSampleTarget.durationMs,
                lastRunAt: sinkDataSampleTarget.completedAt,
                runStatusByNodeId,
              }),
          onOpenSourceDataSample: dataSampleProjection.onOpen,
          onSelectNode: data.onSelectNode,
          onInspectCanvasColumn: isNativeTransform ? outputInspection.open : undefined,
          onOpenNode:
            isNativeTransform && canOpenRelationalTree
              ? () => openRelationalTree(node.id)
              : data.role === 'transform' && typeof data.onInspectNode === 'function'
                ? () => data.onInspectNode?.(node.id, 'general')
                : data.onOpenNode,
        };

        return {
          ...node,
          ariaLabel: projectedData.projectAccessibleHealthLabel?.(projectedData) ?? node.ariaLabel,
          data: projectedData,
        };
      }),
      edges: graph.edges,
    }),
    [
      applicationLanguage,
      graph,
      openRelationalTree,
      outputInspection.open,
      projectNodeDataSample,
      relationalTreeTransformIds,
      runSnapshot,
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
    onSetEdgeExecutionGate: graphCommands.onSetEdgeExecutionGate,
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
          policy={{
            ...layout.surfaceStrategy.operationalDrawer,
            tabs: layout.surfaceStrategy.operationalDrawer.tabs.filter((tab) => tab !== 'semantic'),
          }}
          panels={panels}
          chromeState={chromeState}
          runControls={runControls}
          onPreviewExecutionPlan={chromeCommands.onPreviewExecutionPlan}
          onStartRun={chromeCommands.onRun}
          selectionRecoveryCommands={chromeCommands.executionSelectionRecovery}
          dataSampleTabs={dataSampleTabs}
          operationDataTab={
            modelTabActive && relationalTreeTransform != null ? operationDataTab : undefined
          }
        />
      )}
      <CanvasShellMainPanel
        layout={
          relationalTreeTransform == null || panels.activeCanvasId == null
            ? {
                ...shellLayout,
                contextualWorkbench: outputInspection.workbench ?? shellLayout.contextualWorkbench,
              }
            : {
                ...shellLayout,
                inspectorPanelVisible: modelTabActive ? false : shellLayout.inspectorPanelVisible,
                contextualWorkbench: modelTabActive
                  ? undefined
                  : (outputInspection.workbench ?? shellLayout.contextualWorkbench),
                centerSurfaceVisible: modelTabActive,
                centerSurface: (
                  <CanvasModelEditor
                    key={`${panels.activeCanvasId}:${relationalTreeTransform.id}`}
                    canvasId={panels.activeCanvasId}
                    canvasName={panels.activeCanvas?.title ?? ''}
                    transformNode={relationalTreeTransform}
                    nodes={panels.inspectorGraphNodes}
                    edges={panels.inspectorGraphEdges}
                    authoring={panels.relationalTreeAuthoring}
                    initialView={initialModelView}
                    viewRequestId={modelViewRequestId}
                    draftStatus={chromeState.draftStatusState}
                    query={canvasTransformDataSampleQuery}
                    preparePreview={prepareModelPreview}
                    operationDataHost={operationDataHost}
                    onOpenOperationData={
                      layout.surfaceStrategy?.operationalDrawer?.tabs.includes('data')
                        ? openOperationData
                        : undefined
                    }
                    active={modelTabActive}
                    onSelect={() => setModelTabActive(true)}
                    onShowCanvas={() => setModelTabActive(false)}
                    onClose={() => {
                      setRelationalTreeTransformId(null);
                      restoreWorkbenchFocus();
                    }}
                  />
                ),
              }
        }
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
        onOpenModelEditor={openRelationalTree}
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
        canAutoLayout={panels.userPermissions.canEditEdges}
        onToggleImpact={chromeCommands.onToggleImpact}
        onToggleColumns={chromeCommands.onToggleColumns}
        onToggleCostOverlay={chromeCommands.onToggleCostOverlay}
        onGridSizeChange={chromeCommands.onGridSizeChange}
        onCanvasPaletteChange={chromeCommands.onCanvasPaletteChange}
        onToggleGridVisible={chromeCommands.onToggleGridVisible}
        onGridColorChange={chromeCommands.onGridColorChange}
        onToggleSnapToGrid={chromeCommands.onToggleSnapToGrid}
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
