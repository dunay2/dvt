/** Owned concern: resolve Canvas data-sample targets and presentation-safe failures. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import type { RunSnapshot } from '../../ports/runs';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import { createDvtSinkAuthoringMetadata } from './canvasDvtAuthoringModel';

export const CANVAS_SOURCE_DATA_SAMPLE_LIMIT = 20 as const;

export type CanvasSourceDataSampleTarget = Readonly<{
  connectionId: string;
  objectId: string;
  nodeName: string;
}>;

export type CanvasSinkDataSampleTarget = Readonly<{
  runId: string;
  nodeName: string;
  rowsWritten: number;
  completedAt: string;
  durationMs: number;
  status: 'completed';
}>;

function normalizeRelationPath(value: string): readonly string[] {
  return value
    .split('.')
    .map((part) => {
      const normalized = part.trim().toLowerCase();
      const withoutOpening = ['"', '`', '['].includes(normalized[0] ?? '')
        ? normalized.slice(1)
        : normalized;
      return ['"', '`', ']'].includes(withoutOpening.at(-1) ?? '')
        ? withoutOpening.slice(0, -1)
        : withoutOpening;
    })
    .filter(Boolean);
}

function relationsMatch(nodeRelation: string, materializedRelation: string): boolean {
  const nodeParts = normalizeRelationPath(nodeRelation);
  const materializedParts = normalizeRelationPath(materializedRelation);
  if (nodeParts.length < 2 || materializedParts.length < 2) {
    return false;
  }

  const shorterLength = Math.min(nodeParts.length, materializedParts.length);
  return (
    nodeParts.slice(-shorterLength).join('.') === materializedParts.slice(-shorterLength).join('.')
  );
}

export function resolveCanvasSourceDataSampleTarget(
  data: DbtNodeData
): CanvasSourceDataSampleTarget | null {
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(data.metadata?.connectedSourceRef);
  if (
    !connectedSourceRef.success ||
    !connectedSourceRef.data.sourceObjectId.startsWith('relation/')
  ) {
    return null;
  }

  return {
    connectionId: connectedSourceRef.data.connectionRef.connectionId,
    objectId: connectedSourceRef.data.sourceObjectId,
    nodeName: data.name,
  };
}

export function resolveCanvasSinkDataSampleTarget(
  data: DbtNodeData,
  snapshot: RunSnapshot | null | undefined
): CanvasSinkDataSampleTarget | null {
  const materialization = snapshot?.materialization ?? snapshot?.execution?.materialization;
  const sinkMetadata = createDvtSinkAuthoringMetadata({
    name: data.name,
    metadata: data.metadata,
  });
  const nodeRelation = `${sinkMetadata.schema}.${sinkMetadata.table}`;
  if (
    data.role !== 'output' ||
    data.pluginKind !== 'dvt:sink' ||
    snapshot?.status !== 'completed' ||
    materialization == null ||
    nodeRelation == null ||
    !relationsMatch(nodeRelation, materialization.sinkTable)
  ) {
    return null;
  }

  return {
    runId: snapshot.runId,
    nodeName: data.name,
    rowsWritten: materialization.rowsWritten,
    completedAt: materialization.completedAt,
    durationMs: materialization.durationMs,
    status: 'completed',
  };
}

export function resolveCanvasSourceDataSampleError(
  error: unknown,
  nodeName: string
): OperationalDrawerDataSample {
  return {
    status: 'error',
    nodeName,
    reason: error instanceof WarehouseSourceDataSampleQueryError ? error.reason : 'unknown',
  };
}
