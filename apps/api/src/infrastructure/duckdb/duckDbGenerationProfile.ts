/**
 * Owned concern: DuckDB SQL locators and adapter error translation for the shared LOCAL profile.
 * @baseline ADR-0058 and #3394: physical SQL stays inside the DuckDB adapter.
 * @decision Delegate value/budget invariants to domain; preserve existing DuckDB error codes.
 */
import {
  LocalDataBatchError,
  validateLocalDataBatch,
  validateLocalDataColumns,
  validateLocalDataLimits,
  type GenerationColumn,
  type GenerationLimits,
} from '../../domain/localDataBatch.js';

export type GenerationFailure =
  | 'INVALID_INPUT'
  | 'INVALID_MANIFEST'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_BATCH'
  | 'CAPTURE_BUDGET'
  | 'CAPTURE_SEALED'
  | 'CAPTURE_MISSING'
  | 'CAPTURE_EXISTS'
  | 'HEAD_CONFLICT'
  | 'MANIFEST_MISMATCH'
  | 'ROW_COUNT_MISMATCH'
  | 'SCHEMA_MISMATCH'
  | 'CORRUPT_METADATA'
  | 'STORAGE_IDENTITY_MISMATCH'
  | 'ACCESS_REJECTED'
  | 'TRANSACTION_FAILED';
export class DuckDbGenerationError extends Error {
  public constructor(readonly code: GenerationFailure) {
    super(`Local generation rejected: ${code}`);
    this.name = 'DuckDbGenerationError';
  }
}
export function validateGenerationLimits(limits: GenerationLimits): GenerationLimits {
  return translateProfileError(() => validateLocalDataLimits(limits));
}
export function generationColumnSql(columns: readonly GenerationColumn[]): string {
  translateProfileError(() => validateLocalDataColumns(columns));
  return columns
    .map((c) => `c${c.ordinal} ${c.localType}${c.nullable ? '' : ' NOT NULL'}`)
    .join(', ');
}
export function validateGenerationBatch(
  columns: readonly GenerationColumn[],
  input: readonly (readonly unknown[])[]
) {
  return translateProfileError(() => validateLocalDataBatch(columns, input));
}

function translateProfileError<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof LocalDataBatchError) throw new DuckDbGenerationError(error.code);
    throw error;
  }
}
export function internalGenerationRelation(key: unknown): string {
  if (typeof key !== 'string' || !/^r_[0-9a-f]{32}$/u.test(key)) {
    throw new DuckDbGenerationError('CORRUPT_METADATA');
  }
  return `dvt_store.${key}`;
}
