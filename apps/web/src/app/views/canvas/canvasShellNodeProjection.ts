/**
Owned concern: project Canvas card actions and observed execution evidence without acquiring data.
@baseline InspectCanvasNode: file-backed models enter their existing Properties Code authority.
@decision Resolve workspace-file capability before shared native-model presentation kinds.
@consequence File models cannot enter an absent canonical tree; explicit Code denial remains effective.
@version 1.0.1
 */
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
  projection: CanvasShellNodeProjection,
  canOpenNodeCode: boolean
): DbtNodeData['onOpenNode'] {
  if (data.presentationTruth?.code.kind === 'workspace-file' && projection.modelIds.has(nodeId)) {
    const inspect = data.onInspectNode;
    return inspect == null
      ? undefined
      : () => inspect(nodeId, canOpenNodeCode ? 'code' : 'general');
  }
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
    const canOpenNodeCode = data.canOpenNodeCode !== false && canInspectCode;
    const sample = projection.projectSample(node.id, data);
    const sinkEvidence = resolveCanvasSinkRunEvidence(data, runSnapshot);
    const activeRunAt =
      runSnapshot?.completedAt ?? runSnapshot?.startedAt ?? runSnapshot?.createdAt;
    const projectedData: DbtNodeData = {
      ...data,
      sourceMetricAvailability: sample.sourceMetricAvailability,
      dataActionLabel: sample.canOpen ? projection.previewLabel : undefined,
      canOpenNodeCode,
      onOpenSourceDataSample: sample.onOpen,
      onInspectCanvasColumn: isNativeTransform ? projection.inspectOutput : undefined,
      onOpenNode: resolveNodeOpenAction(node.id, data, projection, canOpenNodeCode),
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
