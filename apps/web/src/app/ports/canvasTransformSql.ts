/** Read authorized SQL for one saved canonical Transform without executing its rows. */
import type { TransformSqlProjectionRequest, TransformSqlProjectionResponse } from '@dvt/contracts';

export interface ICanvasTransformSqlQueryPort {
  projectTransformSql(
    input: TransformSqlProjectionRequest
  ): Promise<TransformSqlProjectionResponse>;
}

export type CanvasTransformSqlQueryBinding = Readonly<{
  canvasId: string;
  query: ICanvasTransformSqlQueryPort;
  scopeKey?: string;
}>;

export class CanvasTransformSqlQueryError extends Error {
  constructor() {
    super('The authorized Canvas Transform SQL could not be read.');
    this.name = 'CanvasTransformSqlQueryError';
  }
}
