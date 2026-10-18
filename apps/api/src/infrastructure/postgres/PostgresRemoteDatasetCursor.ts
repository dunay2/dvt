/**
 * Owned concern: admit one sequential PostgreSQL pull at a time and retain truthful EOF/budget state.
 * @baseline #3394: a reader never treats a safety stop as source exhaustion.
 * @decision Keep native I/O injected inside the PostgreSQL adapter; any failed read is terminal.
 * @consequence Limits apply after driver decoding, not to socket buffers or hard process RSS.
 */
import type { LocalDataSchemaV1 } from '@dvt/contracts';

import {
  MAX_BATCH_ROWS,
  validateLocalDataLimits,
  type GenerationLimits,
} from '../../domain/localDataBatch.js';

import type { PostgresLocalDataBatchCodec } from './postgresLocalDataBatchCodec.js';

type PostgresDatasetReadFailure =
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

type PostgresDatasetBatch = ReturnType<PostgresLocalDataBatchCodec['decode']> &
  Readonly<{ endOfSource: boolean }>;

/** No client, SQL, cursor name, credentials or mutable driver object leaves this view. */
export interface PostgresDatasetCursor {
  readonly schema: LocalDataSchemaV1;
  readonly observedAt: string;
  read(maxRows: number): Promise<PostgresDatasetBatch>;
}

/** Only metadata used for positional decoding crosses the native-driver boundary. */
type PostgresFieldSignature = Readonly<{
  name: string;
  dataTypeID: number;
  tableID: number;
  columnID: number;
  dataTypeModifier: number;
  format: string;
}>;

type Options = Readonly<{
  codec: PostgresLocalDataBatchCodec;
  fields: readonly PostgresFieldSignature[];
  observedAt: string;
  limits: GenerationLimits;
  checkpoint: () => Promise<void>;
  readNative: (
    maxRows: number
  ) => Promise<
    Readonly<{
      rows: unknown[][];
      result?: Readonly<{ fields: readonly PostgresFieldSignature[] }>;
    }>
  >;
}>;

export class PostgresPullCursor implements PostgresDatasetCursor {
  public readonly schema: LocalDataSchemaV1;
  public readonly observedAt: string;
  private active: Promise<PostgresDatasetBatch> | undefined;
  private finishing: Promise<void> | undefined;
  private readonly options: Options;
  private eof = false;
  private rows = 0;
  private bytes = 0;
  private failure: Error | undefined;

  public constructor(options: Options) {
    this.schema = options.codec.schema;
    this.observedAt = options.observedAt;
    this.options = Object.freeze({
      codec: options.codec,
      observedAt: options.observedAt,
      fields: Object.freeze(options.fields.map(copyFieldSignature)),
      limits: validatePostgresReadLimits(options.limits),
      checkpoint: options.checkpoint,
      readNative: options.readNative,
    });
  }

  public read(maxRows: number): Promise<PostgresDatasetBatch> {
    if (this.finishing) return Promise.reject(new PostgresDatasetReadError('CURSOR_CLOSED'));
    if (this.failure) return Promise.reject(this.failure);
    if (this.active) return this.reject('READ_IN_PROGRESS');
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || maxRows > MAX_BATCH_ROWS) {
      return this.reject('INVALID_INPUT');
    }
    // Install active before a checkpoint can synchronously reenter read or finish.
    const pending = Promise.resolve().then(() => this.pull(maxRows));
    this.active = pending;
    // Observe abandoned/caught operations too; a consumer cannot turn failure into successful closure.
    void pending.then(
      () => {
        this.active = undefined;
      },
      (error: unknown) => {
        this.failure ??= asReadError(error);
        this.active = undefined;
      }
    );
    return pending;
  }

  /** One terminal completion, including rejection; cleanup must never reauthorize or reopen it. */
  public finish(): Promise<void> {
    if (!this.finishing) {
      const pending = this.active;
      if (pending) this.failure ??= new PostgresDatasetReadError('READ_IN_PROGRESS');
      // Install the boundary before invoking a potentially reentrant checkpoint.
      this.finishing = Promise.resolve().then(() => this.finishOnce(pending));
    }
    return this.finishing;
  }

  private async finishOnce(pending: Promise<PostgresDatasetBatch> | undefined): Promise<void> {
    if (pending) {
      try {
        await pending;
      } catch {
        /* The terminal failure is retained below. */
      }
    }
    if (this.failure) throw this.failure;
    try {
      await this.options.checkpoint();
    } catch (error) {
      this.failure ??= asReadError(error);
      throw this.failure;
    }
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
    // Validate and decode received data synchronously before another callback can mutate it.
    if (!Array.isArray(batch.rows) || batch.rows.length > requested) {
      throw new PostgresDatasetReadError('PROVIDER_FAILED');
    }
    if (!sameFields(this.options.fields, batch.result?.fields)) {
      throw new PostgresDatasetReadError('SCHEMA_CHANGED');
    }
    if (batch.rows.length > remaining) throw new PostgresDatasetReadError('READ_BUDGET');
    const decoded =
      batch.rows.length === 0
        ? { rows: [], logicalBytes: 0, decodedTextBytes: 0 }
        : this.options.codec.decode(batch.rows);
    const eof = batch.rows.length < requested;
    await this.options.checkpoint();
    if (this.failure) throw this.failure;
    if (this.bytes + decoded.logicalBytes > this.options.limits.maxLogicalBytes) {
      throw new PostgresDatasetReadError('READ_BUDGET');
    }
    this.rows += decoded.rows.length;
    this.bytes += decoded.logicalBytes;
    this.eof = eof;
    return { ...decoded, endOfSource: this.eof };
  }
}

function sameFields(
  expected: readonly PostgresFieldSignature[],
  actual: readonly PostgresFieldSignature[] | undefined
): boolean {
  if (!Array.isArray(actual)) return false;
  return (
    expected.length === actual.length &&
    expected.every((field, i) => {
      const other = actual[i];
      return (
        other !== null &&
        typeof other === 'object' &&
        field.name === other.name &&
        field.dataTypeID === other.dataTypeID &&
        field.tableID === other.tableID &&
        field.columnID === other.columnID &&
        field.dataTypeModifier === other.dataTypeModifier &&
        other.format === 'text'
      );
    })
  );
}

function copyFieldSignature(field: PostgresFieldSignature): PostgresFieldSignature {
  return Object.freeze({
    name: field.name,
    dataTypeID: field.dataTypeID,
    tableID: field.tableID,
    columnID: field.columnID,
    dataTypeModifier: field.dataTypeModifier,
    format: field.format,
  });
}

function asReadError(error: unknown): Error {
  return error instanceof Error ? error : new PostgresDatasetReadError('PROVIDER_FAILED');
}

/** Translate value-policy errors at the PostgreSQL boundary, not through DuckDB. */
export function validatePostgresReadLimits(limits: GenerationLimits): GenerationLimits {
  try {
    return validateLocalDataLimits(limits);
  } catch {
    throw new PostgresDatasetReadError('INVALID_INPUT');
  }
}
