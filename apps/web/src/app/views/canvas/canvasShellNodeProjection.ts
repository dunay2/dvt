/**
Owned concern: project Canvas card actions and observed execution evidence without acquiring data.
@baseline InspectCanvasNode: single-click inspection is distinct from Model editor entry.
@decision Preserve genuine node-open actions without an inspection fallback.
@consequence Double-click cannot open Properties; file Code remains under the existing inspection authority.
@version 1.0.2
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
  projection: CanvasShellNodeProjection
): DbtNodeData['onOpenNode'] {
  if (
    data.presentationTruth?.code.kind === 'workspace-file' &&
    (data.role === 'transform' || projection.modelIds.has(nodeId))
  ) {
    return undefined;
  }
  if (data.pluginKind === 'dvt:transform' && projection.modelIds.has(nodeId)) {
    return () => projection.openModel(nodeId);
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
    const sinkEvidence = resolveCanvasSinkRunEvidence(node.id, data, runSnapshot);
    const activeRunAt =
      runSnapshot?.completedAt ?? runSnapshot?.startedAt ?? runSnapshot?.createdAt;
    const projectedData: DbtNodeData = {
      ...data,
      sourceMetricAvailability: sample.sourceMetricAvailability,
      dataActionLabel: sample.canOpen ? projection.previewLabel : undefined,
      canOpenNodeCode,
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
