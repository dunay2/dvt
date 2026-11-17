/** Model SQL authoring queries; Generate remains the existing Model draft command. */
import type {
  ModelSqlTarget,
  ModelSqlContextResponse,
  ModelSqlCompilationRequest,
  ModelSqlCompilationResponse,
  TransformSqlDraftDataSampleRequest,
  TransformSqlDraftDataSampleResponse,
} from '@dvt/contracts';

export type ModelSqlFailure = 'unavailable' | 'stale' | 'denied' | 'contract';
export class CanvasModelSqlQueryError extends Error {
  constructor(readonly reason: ModelSqlFailure) {
    super(`Model SQL query failed: ${reason}`);
    this.name = 'CanvasModelSqlQueryError';
  }
}
export interface ICanvasModelSqlQueryPort {
  context(input: ModelSqlTarget, signal?: AbortSignal): Promise<ModelSqlContextResponse>;
  compile(
    input: ModelSqlCompilationRequest,
    signal?: AbortSignal
  ): Promise<ModelSqlCompilationResponse>;
  preview(
    input: TransformSqlDraftDataSampleRequest,
    signal?: AbortSignal
  ): Promise<TransformSqlDraftDataSampleResponse>;
}
