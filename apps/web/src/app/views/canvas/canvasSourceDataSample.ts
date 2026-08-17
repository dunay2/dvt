/** Owned concern: resolve imported source sample targets and presentation-safe failures. */
import { ConnectedSourceRefSchema } from '@dvt/contracts';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';

export const CANVAS_SOURCE_DATA_SAMPLE_LIMIT = 20 as const;

export type CanvasSourceDataSampleTarget = Readonly<{
  connectionId: string;
  objectId: string;
  nodeName: string;
}>;

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
