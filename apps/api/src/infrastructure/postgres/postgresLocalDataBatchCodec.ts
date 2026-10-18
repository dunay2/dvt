/**
 * Owned concern: decode one bounded positional PostgreSQL text batch without precision loss.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Admit only int8/bool/text/varchar OIDs into the existing LOCAL physical profile.
 * @consequence This codec neither opens a connection nor attests source authorization or EOF.
 */
import type { LocalDataSchemaV1 } from '@dvt/contracts';

import {
  MAX_BATCH_BYTES,
  MAX_BATCH_ROWS,
  MAX_BATCH_COLUMNS,
  validateLocalDataBatch,
  type GenerationCell,
} from '../../domain/localDataBatch.js';

type CodecFailure = 'UNSUPPORTED_POSTGRES_SCHEMA' | 'INVALID_POSTGRES_BATCH';
export class PostgresLocalDataCodecError extends Error {
  public constructor(readonly code: CodecFailure) {
    super(`Local PostgreSQL conversion rejected: ${code}`);
    this.name = 'PostgresLocalDataCodecError';
  }
}

/** Metadata must be resolved by the trusted reader, never inferred from sample values. */
export type PostgresLocalDataField = Readonly<{
  ordinal: number;
  name: string;
  dataTypeID: number;
  nullable: boolean;
}>;
export type PostgresLocalDataBatchCodec = Readonly<{
  schema: LocalDataSchemaV1;
  decode: (input: readonly (readonly unknown[])[]) => Readonly<{
    rows: GenerationCell[][];
    decodedTextBytes: number;
    logicalBytes: number;
  }>;
}>;

function typeForOid(oid: number): Readonly<{ sourceType: string; localType: string }> {
  switch (oid) {
    case 20: return { sourceType: 'int8', localType: 'BIGINT' };
    case 16: return { sourceType: 'bool', localType: 'BOOLEAN' };
    case 25: return { sourceType: 'text', localType: 'VARCHAR' };
    case 1043: return { sourceType: 'varchar', localType: 'VARCHAR' };
    default: throw new PostgresLocalDataCodecError('UNSUPPORTED_POSTGRES_SCHEMA');
  }
}

function decodeCell(type: string, value: unknown, nullable: boolean): GenerationCell {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || value.length > MAX_BATCH_BYTES) {
    throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
  }
  if (type === 'int8') {
    // PostgreSQL text int8 is canonical decimal, at most 20 characters including sign.
    if (value.length > 20 || !/^(?:0|-?[1-9][0-9]*)$/u.test(value)) {
      throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
    }
    const integer = BigInt(value);
    if (integer < -(1n << 63n) || integer >= (1n << 63n)) {
      throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
    }
    return integer;
  }
  if (type === 'bool') {
    if (value === 't') return true;
    if (value === 'f') return false;
    throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
  }
  // Valid supplementary characters match as code points, not unpaired surrogates.
  if (value.includes('\0') || /[\uD800-\uDFFF]/u.test(value)) {
    throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
  }
  return value;
}

/** Raw text only: the future pg cursor must use array rows and query-local parsers. */
export function createPostgresLocalDataBatchCodec(
  fields: readonly PostgresLocalDataField[]
): PostgresLocalDataBatchCodec {
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > MAX_BATCH_COLUMNS) {
    throw new PostgresLocalDataCodecError('UNSUPPORTED_POSTGRES_SCHEMA');
  }
  const columns: LocalDataSchemaV1['columns'] = Array.from(fields, (field, ordinal) => {
    if (!field || field.ordinal !== ordinal || typeof field.nullable !== 'boolean' ||
        typeof field.name !== 'string' || !field.name.length || field.name.length > 256 ||
        field.name.includes('\0') || /[\uD800-\uDFFF]/u.test(field.name)) {
      throw new PostgresLocalDataCodecError('UNSUPPORTED_POSTGRES_SCHEMA');
    }
    return Object.freeze({ ordinal, name: field.name, nullable: field.nullable,
      ...typeForOid(field.dataTypeID) });
  });
  Object.freeze(columns);
  const schema: LocalDataSchemaV1 = Object.freeze({ schemaVersion: 'local-data-schema.v1', columns });
  return Object.freeze({
    schema,
    decode(input: readonly (readonly unknown[])[]) {
      if (!Array.isArray(input) || input.length < 1 || input.length > MAX_BATCH_ROWS) {
        throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
      }
      let decodedTextBytes = 0;
      const rows: GenerationCell[][] = [];
      for (const row of input) {
        if (!Array.isArray(row) || row.length !== columns.length) {
          throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
        }
        const decoded: GenerationCell[] = [];
        for (const column of columns) {
          const value: unknown = row[column.ordinal];
          const cell = decodeCell(column.sourceType, value, column.nullable);
          // UTF-8 text bytes, excluding NULL; not wire bytes, RSS or persisted disk size.
          if (typeof value === 'string') decodedTextBytes += Buffer.byteLength(value, 'utf8');
          if (decodedTextBytes > MAX_BATCH_BYTES) {
            throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
          }
          decoded.push(cell);
        }
        rows.push(decoded);
      }
      try {
        const batch = validateLocalDataBatch(columns, rows);
        return { ...batch, decodedTextBytes };
      } catch {
        throw new PostgresLocalDataCodecError('INVALID_POSTGRES_BATCH');
      }
    },
  });
}
