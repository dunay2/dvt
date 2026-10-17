/**
 * Owned concern: admit one sequential PostgreSQL pull at a time and retain truthful EOF/budget state.
 * @baseline #3394: a reader never treats a safety stop as source exhaustion.
 * @decision Keep native I/O injected inside the PostgreSQL adapter; any failed read is terminal.
 * @consequence Limits apply after driver decoding, not to socket buffers or hard process RSS.
 */
import type { LocalDataSchemaV1 } from '@dvt/contracts';
import type { FieldDef, QueryResult } from 'pg';

import { MAX_BATCH_ROWS, type GenerationLimits } from '../duckdb/duckDbGenerationProfile.js';

import type { PostgresLocalDataBatchCodec } from './postgresLocalDataBatchCodec.js';

export type PostgresDatasetReadFailure =
  | 'INVALID_INPUT'
  | 'SOURCE_REJECTED'
  | 'UNSUPPORTED_SOURCE'
  | 'SCHEMA_CHANGED'
  | 'ACCESS_REJECTED'
  | 'READ_IN_PROGRESS'
  | 'CURSOR_CLOSED'
  | 'READ_BUDGET'
  | 'READ_TIMEOUT'
  | 'PROVIDER_FAILED'
  | 'CLEANUP_FAILED';

export class PostgresDatasetReadError extends Error {
  public constructor(public readonly code: PostgresDatasetReadFailure) {
    super(`LOCAL PostgreSQL read rejected: ${code}`);
    this.name = 'PostgresDatasetReadError';
  }
}

export type PostgresDatasetBatch = ReturnType<PostgresLocalDataBatchCodec['decode']> &
  Readonly<{ endOfSource: boolean }>;

/** No client, SQL, cursor name, credentials or mutable driver object leaves this view. */
export interface PostgresDatasetCursor {
  readonly schema: LocalDataSchemaV1;
  readonly observedAt: string;
  read(maxRows: number): Promise<PostgresDatasetBatch>;
}

type Options = Readonly<{
  codec: PostgresLocalDataBatchCodec;
  fields: readonly FieldDef[];
  observedAt: string;
  limits: GenerationLimits;
  checkpoint: () => Promise<void>;
  readNative: (maxRows: number) => Promise<Readonly<{ rows: unknown[][]; result?: QueryResult }>>;
}>;

export class PostgresPullCursor implements PostgresDatasetCursor {
  public readonly schema: LocalDataSchemaV1;
  public readonly observedAt: string;
  private active: Promise<PostgresDatasetBatch> | undefined;
  private closed = false;
  private eof = false;
  private rows = 0;
  private bytes = 0;
  private failure: Error | undefined;

  public constructor(private readonly options: Options) {
    this.schema = options.codec.schema;
    this.observedAt = options.observedAt;
  }

  public read(maxRows: number): Promise<PostgresDatasetBatch> {
    if (this.closed) return Promise.reject(new PostgresDatasetReadError('CURSOR_CLOSED'));
    if (this.failure) return Promise.reject(this.failure);
    if (this.active) return this.reject('READ_IN_PROGRESS');
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > MAX_BATCH_ROWS) {
      return this.reject('INVALID_INPUT');
    }
    const pending = this.pull(maxRows);
    this.active = pending;
    // Observe abandoned/caught operations too; a consumer cannot turn failure into successful closure.
    void pending.then(
      () => { this.active = undefined; },
      (error: unknown) => {
        this.failure = error instanceof Error ? error : new PostgresDatasetReadError('PROVIDER_FAILED');
        this.active = undefined;
      }
    );
    return pending;
  }

  public async finish(): Promise<void> {
    this.closed = true;
    const pending = this.active;
    if (pending) {
      this.failure ??= new PostgresDatasetReadError('READ_IN_PROGRESS');
      try { await pending; } catch { /* The terminal failure is retained below. */ }
    }
    if (this.failure) throw this.failure;
    await this.options.checkpoint();
  }

  private reject(code: PostgresDatasetReadFailure): Promise<never> {
    this.failure = new PostgresDatasetReadError(code);
    return Promise.reject(this.failure);
  }

  private async pull(maxRows: number): Promise<PostgresDatasetBatch> {
    await this.options.checkpoint();
    if (this.failure) throw this.failure;
    if (this.eof) return { rows: [], logicalBytes: 0, decodedTextBytes: 0, endOfSource: true };
    const remaining = this.options.limits.maxRows - this.rows;
    // At the safety ceiling one non-persisted sentinel distinguishes EOF from an incomplete FULL.
    const requested = Math.min(maxRows, remaining || 1);
    const batch = await this.options.readNative(requested);
    await this.options.checkpoint();
    if (this.failure) throw this.failure;
    if (batch.rows.length > requested) throw new PostgresDatasetReadError('PROVIDER_FAILED');
    if (batch.result && !sameFields(this.options.fields, batch.result.fields)) {
      throw new PostgresDatasetReadError('SCHEMA_CHANGED');
    }
    if (batch.rows.length > remaining) throw new PostgresDatasetReadError('READ_BUDGET');
    const decoded = batch.rows.length === 0
      ? { rows: [], logicalBytes: 0, decodedTextBytes: 0 }
      : this.options.codec.decode(batch.rows);
    if (this.bytes + decoded.logicalBytes > this.options.limits.maxLogicalBytes) {
      throw new PostgresDatasetReadError('READ_BUDGET');
    }
    this.rows += decoded.rows.length;
    this.bytes += decoded.logicalBytes;
    this.eof = batch.rows.length < requested;
    return { ...decoded, endOfSource: this.eof };
  }
}

function sameFields(expected: readonly FieldDef[], actual: readonly FieldDef[]): boolean {
  return expected.length === actual.length && expected.every((field, i) => {
    const other = actual[i];
    return other !== undefined && field.name === other.name && field.dataTypeID === other.dataTypeID &&
      field.tableID === other.tableID && field.columnID === other.columnID &&
      field.dataTypeModifier === other.dataTypeModifier && other.format === 'text';
  });
}
