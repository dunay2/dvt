/** Owned concern: project Canvas cards, Inspector contributions and admitted data actions. */
import { useMemo } from 'react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasShellProps } from './canvasShell.types';
import { projectCanvasShellNodes } from './canvasShellNodeProjection';
import { buildCanvasInspectorCodeContributions } from './graphDraftWorkspaceFileCodeContribution';
import { useCanvasCardPresentation } from './useCanvasCardPresentation';
import { useCanvasNodeDataSample } from './useCanvasNodeDataSample';

export function useCanvasShellGraphPresentation({
  graph,
  panels,
  runSnapshot,
  warehouseSourceDataSampleQuery,
  canvasTransformDataSampleQuery,
  prepareModelPreview,
  projectRoot,
  filePlacementLayoutKey,
  showCardMetricsLabel,
  previewLabel,
  modelIds,
  openModel,
  inspectOutput,
}: Pick<
  CanvasShellProps,
  | 'graph'
  | 'panels'
  | 'runSnapshot'
  | 'warehouseSourceDataSampleQuery'
  | 'canvasTransformDataSampleQuery'
  | 'prepareModelPreview'
> &
  Readonly<{
    projectRoot?: string;
    filePlacementLayoutKey: CanvasShellProps['layout']['filePlacementLayoutKey'];
    showCardMetricsLabel: string;
    previewLabel: string;
    modelIds: ReadonlySet<string>;
    openModel: (nodeId: string) => void;
    inspectOutput: DbtNodeData['onInspectCanvasColumn'];
  }>) {
  const { dataSampleTabs, projectNode, openSource } = useCanvasNodeDataSample({
    activeCanvasId: panels.activeCanvasId,
    nodes: graph.nodesWithImpact,
    canonicalNodes: panels.inspectorGraphNodes,
    canonicalEdges: panels.inspectorGraphEdges,
    canEditModel: panels.relationalTreeAuthoring?.canEditNode === true,
    warehouseSourceDataSampleQuery,
    canvasTransformDataSampleQuery,
    prepareModelPreview,
  });
  const {
    visibleMetricNodeIds,
    sourceAppearanceByNode,
    contribution: cardAppearance,
  } = useCanvasCardPresentation(
    panels,
    graph.nodesWithImpact,
    showCardMetricsLabel,
    projectRoot,
    filePlacementLayoutKey
  );
  const nodes = useMemo(
    () =>
      projectCanvasShellNodes(graph.nodesWithImpact, {
        visibleMetricNodeIds,
        sourceAppearanceByNode,
        modelIds,
        openModel,
        inspectOutput,
        previewLabel,
        projectSample: projectNode,
        runSnapshot,
      }),
    [
      graph.nodesWithImpact,
      visibleMetricNodeIds,
      sourceAppearanceByNode,
      modelIds,
      openModel,
      inspectOutput,
      previewLabel,
      projectNode,
      runSnapshot,
    ]
  );
  const presentedGraph = useMemo(() => ({ ...graph, nodesWithImpact: nodes }), [graph, nodes]);
  const { inspectorNode, inspectorWorkbenchContributions } = panels;
  const inspectorContributions = useMemo(
    () =>
      buildCanvasInspectorCodeContributions(
        { inspectorNode, inspectorWorkbenchContributions },
        graph.nodesWithImpact
      ),
    [inspectorNode, inspectorWorkbenchContributions, graph.nodesWithImpact]
  );
  const presentedPanels = useMemo(
    () => ({
      ...panels,
      inspectorWorkbenchContributions:
        cardAppearance == null
          ? inspectorContributions
          : [...inspectorContributions, cardAppearance],
    }),
    [panels, inspectorContributions, cardAppearance]
  );

  return { graph: presentedGraph, panels: presentedPanels, dataSampleTabs, openSource };
}
