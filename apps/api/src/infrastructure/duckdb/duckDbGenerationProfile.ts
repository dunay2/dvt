/**
 * Owned concern: admit an exact, finite physical row profile for LOCAL staging.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Accept native BIGINT/BOOLEAN/VARCHAR only; bind values, never parse SQL declarations.
 * @consequence Other types require their own parity evidence; budgets here are not workspace quotas.
 */
export type GenerationFailure =
  | 'INVALID_INPUT' | 'INVALID_MANIFEST' | 'UNSUPPORTED_SCHEMA' | 'INVALID_BATCH'
  | 'CAPTURE_BUDGET' | 'CAPTURE_SEALED' | 'CAPTURE_MISSING' | 'CAPTURE_EXISTS'
  | 'HEAD_CONFLICT' | 'MANIFEST_MISMATCH' | 'ROW_COUNT_MISMATCH' | 'SCHEMA_MISMATCH'
  | 'CORRUPT_METADATA' | 'STORAGE_IDENTITY_MISMATCH' | 'ACCESS_REJECTED' | 'TRANSACTION_FAILED';
export class DuckDbGenerationError extends Error {
  public constructor(readonly code: GenerationFailure) {
    super(`Local generation rejected: ${code}`);
    this.name = 'DuckDbGenerationError';
  }
}
export type GenerationColumn = Readonly<{ ordinal: number; localType: string; nullable: boolean }>;
export type GenerationCell = bigint | boolean | string | null;
export type GenerationLimits = Readonly<{ maxRows: number; maxLogicalBytes: number }>;
export const MAX_BATCH_ROWS = 1024;
export const MAX_BATCH_BYTES = 1048576;

export function validateGenerationLimits(limits: GenerationLimits): GenerationLimits {
  if (!Number.isSafeInteger(limits.maxRows) || limits.maxRows < 1 || limits.maxRows > 100000 ||
      !Number.isSafeInteger(limits.maxLogicalBytes) || limits.maxLogicalBytes < 1 ||
      limits.maxLogicalBytes > 16777216) throw new DuckDbGenerationError('INVALID_INPUT');
  return Object.freeze({ maxRows: limits.maxRows, maxLogicalBytes: limits.maxLogicalBytes });
}
export function generationColumnSql(columns: readonly GenerationColumn[]): string {
  if (!Array.isArray(columns) || columns.length < 1 || columns.length > 32 ||
      columns.some((c, i) => c.ordinal !== i || typeof c.nullable !== 'boolean' ||
        !['BIGINT', 'BOOLEAN', 'VARCHAR'].includes(c.localType))) {
    throw new DuckDbGenerationError('UNSUPPORTED_SCHEMA');
  }
  return columns.map(c => `c${c.ordinal} ${c.localType}${c.nullable ? '' : ' NOT NULL'}`).join(', ');
}
/** Logical bytes: null=1, boolean=1, bigint=8, varchar=UTF-8 bytes. Not physical disk/RSS. */
export function validateGenerationBatch(columns: readonly GenerationColumn[], input: readonly (readonly unknown[])[]) {
  generationColumnSql(columns);
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_BATCH_ROWS) {
    throw new DuckDbGenerationError('INVALID_BATCH');
  }
  let logicalBytes = 0;
  const rows: GenerationCell[][] = [];
  for (const row of input) {
    if (!Array.isArray(row) || row.length !== columns.length) throw new DuckDbGenerationError('INVALID_BATCH');
    const copy: GenerationCell[] = [];
    for (let i = 0; i < columns.length; i++) {
      const value: unknown = row[i]; const column = columns[i]!;
      if (value === null && column.nullable) { copy.push(null); logicalBytes++; }
      else if (column.localType === 'BIGINT' && typeof value === 'bigint' &&
               value >= -(1n << 63n) && value < (1n << 63n)) { copy.push(value); logicalBytes += 8; }
      else if (column.localType === 'BOOLEAN' && typeof value === 'boolean') { copy.push(value); logicalBytes++; }
      else if (column.localType === 'VARCHAR' && typeof value === 'string' &&
               value.length <= MAX_BATCH_BYTES && !/[\uD800-\uDFFF]/u.test(value)) {
        logicalBytes += Buffer.byteLength(value, 'utf8'); copy.push(value);
      } else throw new DuckDbGenerationError('INVALID_BATCH');
      if (logicalBytes > MAX_BATCH_BYTES) throw new DuckDbGenerationError('INVALID_BATCH');
    }
    rows.push(copy);
  }
  return { rows, logicalBytes };
}
export function internalGenerationRelation(key: unknown): string {
  if (typeof key !== 'string' || !/^r_[0-9a-f]{32}$/u.test(key)) {
    throw new DuckDbGenerationError('CORRUPT_METADATA');
  }
  return `dvt_store.${key}`;
}
