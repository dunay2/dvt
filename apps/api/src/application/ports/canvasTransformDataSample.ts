/** Owned concern: define the application boundary for bounded Transform row sampling. */
import type { TransformDataSampleResponse, WarehouseConnectionType } from '@dvt/contracts';

export type CanvasTransformDataSampleProbeInput = Readonly<{
  type: WarehouseConnectionType;
  credentialRef: string;
  sql: string;
  limit: number;
  orderBy?: readonly Readonly<{
    name: string;
    direction: 'ASC' | 'DESC';
    nulls: 'FIRST' | 'LAST';
  }>[];
}>;

export type CanvasTransformDataSampleProbeResult = Pick<
  TransformDataSampleResponse,
  'columns' | 'rows' | 'truncated' | 'sampledAt'
>;

export interface ICanvasTransformDataSampleProbe {
  previewTransformRows(
    input: CanvasTransformDataSampleProbeInput
  ): Promise<CanvasTransformDataSampleProbeResult>;
}

export type CanvasTransformDataSampleFailureReason =
  | 'selection_unavailable'
  | 'canvas_changed'
  | 'connection_mismatch'
  | 'projection_unsupported'
  | 'query_failed';

export class CanvasTransformDataSampleUnavailableError extends Error {
  public constructor(readonly reason: CanvasTransformDataSampleFailureReason) {
    super(`Canvas Transform data sample is unavailable: ${reason}`);
    this.name = 'CanvasTransformDataSampleUnavailableError';
  }
}
