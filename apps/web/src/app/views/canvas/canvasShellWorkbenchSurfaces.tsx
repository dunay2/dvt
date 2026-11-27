/** Owned concern: assemble the retained Model and Code surfaces from their current session owners. */
import type { ComponentProps } from 'react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { CanvasModelEditor } from './CanvasModelEditor';
import type { CanvasShellMainPanel } from './CanvasShellMainPanel';
import type { CanvasShellLayout, CanvasShellProps } from './canvasShell.types';
import { CanvasProjectElementsExplorer } from './explorer/CanvasProjectElementsExplorer';
import { CanvasProjectFilesExplorer } from './explorer/CanvasProjectFilesExplorer';
import type { useCanvasCodeWorkbench } from './useCanvasCodeWorkbench';
import type { useCanvasModelSelection } from './useCanvasModelSelection';
import type { useCanvasNodeDataSample } from './useCanvasNodeDataSample';
import type { useCanvasOperationDataTab } from './useCanvasOperationDataTab';

export function buildCanvasProjectFilesSurface({
  code,
  projectRoot,
  openProjectCode,
  openDbtProjectImport,
}: Readonly<{
  code: ReturnType<typeof useCanvasCodeWorkbench>;
  projectRoot?: string;
  openProjectCode: (path?: string) => Promise<boolean>;
  openDbtProjectImport?: () => void;
}>): ComponentProps<typeof CanvasShellMainPanel>['projectFiles'] {
  if (!code.available) return undefined;
  const contextual = code.layout.contextualWorkbench;
  return {
    projectRoot,
    tree: (
      <CanvasProjectFilesExplorer
        projectRoot={projectRoot}
        onOpenFile={(path) => void openProjectCode(path)}
        onImportDbtProject={openDbtProjectImport}
      />
    ),
    panel: contextual?.id === 'project-code' ? contextual.panel : undefined,
    active: code.active,
    onActivate: openProjectCode,
    onCanvas: code.showCanvas,
    onClose: code.active ? contextual?.requestClose : undefined,
    renderElements: (input) => (
      <CanvasProjectElementsExplorer {...input} projectRoot={projectRoot} />
    ),
  };
}

export function buildCanvasModelWorkbenchLayout({
  model,
  code,
  panels,
  nodes,
  draftStatus,
  query,
  preparePreview,
  operationData,
  openSource,
  outputInspection,
}: Readonly<{
  model: ReturnType<typeof useCanvasModelSelection>;
  code: ReturnType<typeof useCanvasCodeWorkbench>;
  panels: CanvasShellProps['panels'];
  nodes: CanvasShellProps['graph']['nodesWithImpact'];
  draftStatus: CanvasShellProps['chromeState']['draftStatusState'];
  query: CanvasShellProps['canvasTransformDataSampleQuery'];
  preparePreview: CanvasShellProps['prepareModelPreview'];
  operationData: ReturnType<typeof useCanvasOperationDataTab>;
  openSource: ReturnType<typeof useCanvasNodeDataSample>['openSource'];
  outputInspection: CanvasShellLayout['contextualWorkbench'];
}>): CanvasShellLayout {
  const { selected, active, openModelIds, scopeKey } = model;
  const { activeCanvasId } = panels;
  const contextual = outputInspection ?? code.layout.contextualWorkbench;
  const layout = {
    ...code.layout,
    modelWorkspace: { currentId: selected?.id ?? null, openIds: openModelIds },
    contextualWorkbench: contextual,
  };
  if (selected == null || activeCanvasId == null) return layout;

  const modelData = nodes.find((node) => node.id === selected.id)?.data as DbtNodeData | undefined;
  const authoring = panels.relationalTreeAuthoring;
  const foreground = active && !code.active;
  return {
    ...layout,
    inspectorPanelVisible: active ? false : layout.inspectorPanelVisible,
    contextualWorkbench: active ? undefined : contextual,
    centerSurfaceVisible: active,
    centerSurface: (
      <CanvasModelEditor
        key={JSON.stringify([scopeKey, activeCanvasId, selected.id])}
        canvasId={activeCanvasId}
        workspaceScope={panels.inspectorAuthoring?.workspaceScope}
        transformNode={selected}
        initialView={model.initialView}
        nodes={panels.inspectorGraphNodes}
        edges={panels.inspectorGraphEdges}
        authoring={
          authoring == null
            ? undefined
            : {
                ...authoring,
                canEditNode: authoring.canEditNode && modelData != null,
                onMapInput: modelData?.onMapCanvasInput,
                onRemoveInput: modelData?.onRemoveCanvasInput,
              }
        }
        draftStatus={draftStatus}
        query={query}
        onExecuteSource={openSource}
        preparePreview={preparePreview}
        operationDataHost={operationData.host}
        onOpenOperationData={operationData.open}
        active={foreground}
        onSelect={model.activate}
        onShowCanvas={() => {
          code.showCanvas();
          model.setActive(false);
        }}
        onClose={() => model.close(selected.id, foreground)}
      />
    ),
  };
}
