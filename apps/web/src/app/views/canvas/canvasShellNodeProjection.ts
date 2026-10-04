/** Pure projection of Canvas card actions and observed execution evidence. */
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasShellGraph, CanvasShellProps } from './canvasShell.types';
import { resolveCanvasSinkRunEvidence } from './canvasSinkRunEvidence';
import { resolveWorkspaceFilePath } from './canvasWorkspaceFilePath';
import type { CanvasNodeDataSampleProjection } from './useCanvasNodeDataSample';

type CanvasShellNodeProjection = Readonly<{
  modelIds: ReadonlySet<string>;
  openModel: (nodeId: string) => void;
  inspectOutput: DbtNodeData['onInspectCanvasColumn'];
  previewLabel: string;
  projectSample: (nodeId: string, data: DbtNodeData) => CanvasNodeDataSampleProjection;
  runSnapshot: CanvasShellProps['runSnapshot'];
}>;

function resolveNodeOpenAction(
  nodeId: string,
  data: DbtNodeData,
  projection: CanvasShellNodeProjection
): DbtNodeData['onOpenNode'] {
  if (data.pluginKind === 'dvt:transform' && projection.modelIds.has(nodeId)) {
    return () => projection.openModel(nodeId);
  }
  if ((data.role === 'input' || data.role === 'transform') && data.onInspectNode != null) {
    return () => data.onInspectNode?.(nodeId, 'general');
  }
  return data.onOpenNode;
}

export function projectCanvasShellNodes(
  nodes: CanvasShellGraph['nodesWithImpact'],
  projection: CanvasShellNodeProjection
): CanvasShellGraph['nodesWithImpact'] {
  return nodes.map((node) => {
    const data = node.data as DbtNodeData;
    const { runSnapshot } = projection;
    const isNativeTransform = data.pluginKind === 'dvt:transform';
    const codeKind = data.presentationTruth?.code.kind;
    const canInspectCode =
      typeof data.onInspectNode === 'function' &&
      (resolveWorkspaceFilePath(data) != null ||
        codeKind === 'inline' ||
        codeKind === 'generated' ||
        codeKind === 'canonical');
    const sample = projection.projectSample(node.id, data);
    const sinkEvidence = resolveCanvasSinkRunEvidence(data, runSnapshot);
    const activeRunAt =
      runSnapshot?.completedAt ?? runSnapshot?.startedAt ?? runSnapshot?.createdAt;
    const projectedData: DbtNodeData = {
      ...data,
      sourceMetricAvailability: sample.sourceMetricAvailability,
      dataActionLabel: sample.canOpen ? projection.previewLabel : undefined,
      canOpenNodeCode: data.canOpenNodeCode !== false && canInspectCode,
      onOpenSourceDataSample: sample.onOpen,
      onInspectCanvasColumn: isNativeTransform ? projection.inspectOutput : undefined,
      onOpenNode: resolveNodeOpenAction(node.id, data, projection),
    };
    if (data.runStatusByNodeId?.has(node.id) === true) {
      if (activeRunAt != null) projectedData.lastRunAt = activeRunAt;
      if (runSnapshot?.durationMs != null) projectedData.durationMs = runSnapshot.durationMs;
    }
    if (sinkEvidence != null) {
      projectedData.rows = sinkEvidence.rowsWritten;
      projectedData.durationMs = sinkEvidence.durationMs;
      projectedData.lastRunAt = sinkEvidence.completedAt;
      projectedData.runStatusByNodeId = new Map(data.runStatusByNodeId).set(
        node.id,
        sinkEvidence.status
      );
    }
    return {
      ...node,
      ariaLabel: projectedData.projectAccessibleHealthLabel?.(projectedData) ?? node.ariaLabel,
      data: projectedData,
    };
  });
}
