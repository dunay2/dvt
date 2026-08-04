import type { LoadObjectFileToPostgresStepTypeConfig } from '@dvt/contracts';
import { parse } from 'csv-parse';

import { ObjectFileIngestionRejectedError } from './objectFilePostgresPluginErrors.js';
import type {
  ObjectFilePostgresRow,
  ObjectFilePostgresScalar,
} from './objectFilePostgresPluginTypes.js';

type ObjectFileSource = LoadObjectFileToPostgresStepTypeConfig['source'];
type ObjectFileColumn = LoadObjectFileToPostgresStepTypeConfig['columns'][number];

export async function parseObjectFileRows(
  bytes: Uint8Array,
  source: ObjectFileSource,
  columns: readonly ObjectFileColumn[],
  signal?: globalThis.AbortSignal
): Promise<readonly ObjectFilePostgresRow[]> {
  assertNotAborted(signal);
  const text = decodeUtf8(bytes);
  const records =
    source.format === 'csv'
      ? await parseCsvRecords(text, source.delimiter, signal)
      : parseJsonLinesRecords(text, signal);

  return records.map((record) => mapRecord(record, columns));
}

async function parseCsvRecords(
  text: string,
  delimiter: string,
  signal?: globalThis.AbortSignal
): Promise<readonly Readonly<Record<string, unknown>>[]> {
  const records: Readonly<Record<string, unknown>>[] = [];

  try {
    const parser = parse(text, {
      bom: true,
      columns: (header) => assertUniqueHeader(header),
      delimiter,
      skip_empty_lines: true,
      relax_column_count: false,
    });
    for await (const record of parser) {
      assertNotAborted(signal);
      records.push(assertRecord(record));
    }
  } catch (error) {
    if (signal?.aborted === true) {
      throw signal.reason ?? error;
    }
    if (error instanceof ObjectFileIngestionRejectedError) {
      throw error;
    }
    throw new ObjectFileIngestionRejectedError(
      'OBJECT_SOURCE_CSV_INVALID',
      'Object source CSV is invalid.'
    );
  }

  return records;
}

function assertUniqueHeader(header: string[]): string[] {
  if (new Set(header).size !== header.length) {
    throw new ObjectFileIngestionRejectedError(
      'OBJECT_SOURCE_CSV_HEADER_INVALID',
      'Object source CSV header contains duplicate fields.'
    );
  }
  return header;
}

function parseJsonLinesRecords(
  text: string,
  signal?: globalThis.AbortSignal
): readonly Readonly<Record<string, unknown>>[] {
  const records: Readonly<Record<string, unknown>>[] = [];
  const lines = text.split(/\r?\n/u);

  for (const line of lines) {
    assertNotAborted(signal);
    if (line.trim().length === 0) {
      continue;
    }

    try {
      records.push(assertRecord(JSON.parse(line)));
    } catch (error) {
      if (error instanceof ObjectFileIngestionRejectedError) {
        throw error;
      }
      throw new ObjectFileIngestionRejectedError(
        'OBJECT_SOURCE_JSONL_INVALID',
        'Object source JSON Lines payload is invalid.'
      );
    }
  }

  return records;
}

function mapRecord(
  record: Readonly<Record<string, unknown>>,
  columns: readonly ObjectFileColumn[]
): ObjectFilePostgresRow {
  return Object.fromEntries(
    columns.map((column) => [column.targetColumn, mapField(record[column.sourceField], column)])
  );
}

function mapField(value: unknown, column: ObjectFileColumn): ObjectFilePostgresScalar {
  if (value === null || value === undefined || (value === '' && column.dataType !== 'text')) {
    if (column.nullable) {
      return null;
    }
    rejectField(column, 'required');
  }

  switch (column.dataType) {
    case 'text':
      return typeof value === 'string' ? value : String(value);
    case 'integer':
      return parseInteger(value, column);
    case 'bigint':
      return parseBigInt(value, column);
    case 'numeric':
      return parseNumeric(value, column);
    case 'boolean':
      return parseBoolean(value, column);
    case 'date':
      return parseDate(value, column);
    case 'timestamp':
      return parseTimestamp(value, column, false);
    case 'timestamp-with-time-zone':
      return parseTimestamp(value, column, true);
  }
}

function parseInteger(value: unknown, column: ObjectFileColumn): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < -2_147_483_648 || parsed > 2_147_483_647) {
    rejectField(column, 'integer');
  }
  return parsed;
}

function parseBigInt(value: unknown, column: ObjectFileColumn): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    rejectField(column, 'bigint encoded as a safe integer or decimal string');
  }
  const token = String(value);
  if (!/^-?\d+$/u.test(token)) {
    rejectField(column, 'bigint');
  }
  try {
    const parsed = BigInt(token);
    if (parsed < -9_223_372_036_854_775_808n || parsed > 9_223_372_036_854_775_807n) {
      rejectField(column, 'bigint');
    }
  } catch {
    rejectField(column, 'bigint');
  }
  return token;
}

function parseNumeric(value: unknown, column: ObjectFileColumn): string {
  const token = String(value);
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(token)) {
    rejectField(column, 'numeric');
  }
  return token;
}

function parseBoolean(value: unknown, column: ObjectFileColumn): boolean {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  rejectField(column, 'boolean');
}

function parseDate(value: unknown, column: ObjectFileColumn): string {
  const token = String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(token);
  if (match === null) {
    rejectField(column, 'date');
  }
  const instant = new Date(`${token}T00:00:00.000Z`);
  if (Number.isNaN(instant.getTime()) || instant.toISOString().slice(0, 10) !== token) {
    rejectField(column, 'date');
  }
  return token;
}

function parseTimestamp(
  value: unknown,
  column: ObjectFileColumn,
  timeZoneRequired: boolean
): string {
  const token = String(value);
  const pattern = timeZoneRequired
    ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u
    : /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/u;
  if (!pattern.test(token) || Number.isNaN(Date.parse(timeZoneRequired ? token : `${token}Z`))) {
    rejectField(column, timeZoneRequired ? 'timestamp-with-time-zone' : 'timestamp');
  }
  return token;
}

function assertRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ObjectFileIngestionRejectedError(
      'OBJECT_SOURCE_RECORD_INVALID',
      'Object source record must be an object.'
    );
  }
  return value as Readonly<Record<string, unknown>>;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ObjectFileIngestionRejectedError(
      'OBJECT_SOURCE_ENCODING_INVALID',
      'Object source is not valid UTF-8.'
    );
  }
}

function rejectField(column: ObjectFileColumn, expectation: string): never {
  throw new ObjectFileIngestionRejectedError(
    'OBJECT_SOURCE_FIELD_INVALID',
    `Object source field ${column.sourceField} must satisfy ${expectation}.`
  );
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('Object-file ingestion was cancelled.');
  }
}
