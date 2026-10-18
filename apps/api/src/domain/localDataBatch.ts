/**
 * Owned concern: exact primitive rows and bounded capture budgets shared by LOCAL adapters.
 * @baseline #3394: preserve the admitted BIGINT/BOOLEAN/VARCHAR value profile.
 * @decision Domain values know neither provider OIDs nor SQL, connections or physical storage.
 * @consequence Logical byte limits are not wire, disk or process-memory quotas.
 */
type BatchFailure = 'INVALID_INPUT' | 'UNSUPPORTED_SCHEMA' | 'INVALID_BATCH';
export class LocalDataBatchError extends Error {
  public constructor(readonly code: BatchFailure) {
    super(`Local data batch rejected: ${code}`);
    this.name = 'LocalDataBatchError';
  }
}
export type GenerationColumn = Readonly<{ ordinal: number; localType: string; nullable: boolean }>;
export type GenerationCell = bigint | boolean | string | null;
export type GenerationLimits = Readonly<{ maxRows: number; maxLogicalBytes: number }>;
export const MAX_BATCH_ROWS = 1024;
export const MAX_BATCH_BYTES = 1048576;
export const MAX_BATCH_COLUMNS = 32;

export function validateLocalDataLimits(limits: GenerationLimits): GenerationLimits {
  if (!limits || !Number.isSafeInteger(limits.maxRows) || limits.maxRows < 1 || limits.maxRows > 100000 ||
      !Number.isSafeInteger(limits.maxLogicalBytes) || limits.maxLogicalBytes < 1 ||
      limits.maxLogicalBytes > 16777216) throw new LocalDataBatchError('INVALID_INPUT');
  return Object.freeze({ maxRows: limits.maxRows, maxLogicalBytes: limits.maxLogicalBytes });
}

/** Validate every ordinal, including holes; Array.some would skip sparse descriptors. */
export function validateLocalDataColumns(columns: readonly GenerationColumn[]): void {
  if (!Array.isArray(columns) || columns.length < 1 || columns.length > MAX_BATCH_COLUMNS) {
    throw new LocalDataBatchError('UNSUPPORTED_SCHEMA');
  }
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (!Object.hasOwn(columns, i) || !column || typeof column !== 'object' ||
        column.ordinal !== i || typeof column.nullable !== 'boolean' ||
        !['BIGINT', 'BOOLEAN', 'VARCHAR'].includes(column.localType)) {
      throw new LocalDataBatchError('UNSUPPORTED_SCHEMA');
    }
  }
}

/** Defensive row copies contain only primitives: null=1, bool=1, int64=8, text=UTF-8 bytes. */
export function validateLocalDataBatch(
  columns: readonly GenerationColumn[],
  input: readonly (readonly unknown[])[]
): Readonly<{ rows: GenerationCell[][]; logicalBytes: number }> {
  validateLocalDataColumns(columns);
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_BATCH_ROWS) {
    throw new LocalDataBatchError('INVALID_BATCH');
  }
  let logicalBytes = 0;
  const rows: GenerationCell[][] = [];
  for (const row of input) {
    if (!Array.isArray(row) || row.length !== columns.length) throw new LocalDataBatchError('INVALID_BATCH');
    const copy: GenerationCell[] = [];
    for (let i = 0; i < columns.length; i++) {
      const value: unknown = row[i];
      const column = columns[i]!;
      if (value === null && column.nullable) { copy.push(null); logicalBytes++; }
      else if (column.localType === 'BIGINT' && typeof value === 'bigint' &&
               value >= -(1n << 63n) && value < (1n << 63n)) { copy.push(value); logicalBytes += 8; }
      else if (column.localType === 'BOOLEAN' && typeof value === 'boolean') { copy.push(value); logicalBytes++; }
      else if (column.localType === 'VARCHAR' && typeof value === 'string' &&
               value.length <= MAX_BATCH_BYTES && !/[\uD800-\uDFFF]/u.test(value)) {
        logicalBytes += Buffer.byteLength(value, 'utf8'); copy.push(value);
      } else throw new LocalDataBatchError('INVALID_BATCH');
      if (logicalBytes > MAX_BATCH_BYTES) throw new LocalDataBatchError('INVALID_BATCH');
    }
    rows.push(copy);
  }
  return { rows, logicalBytes };
}
