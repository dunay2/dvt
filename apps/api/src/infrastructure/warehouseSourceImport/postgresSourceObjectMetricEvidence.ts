/** Owned concern: project Postgres statistics and schema widths into source-object metric evidence. */
import {
  createSourceObjectMetricEvidence,
  type SourceObjectColumn,
  type SourceObjectMetricEvidence,
  type SourceObjectRowCountMetric,
} from '@dvt/contracts';

const POSTGRES_TUPLE_HEADER_BYTES = 24;
const DEFAULT_VARIABLE_WIDTH_BYTES = 64;
const LARGE_VARIABLE_WIDTH_BYTES = 256;

export type PostgresRowCountEvidence = SourceObjectRowCountMetric &
  Readonly<{ method: 'provider-statistics' | 'query-plan' | 'data-scan' }>;

function estimatePostgresColumnWidth(column: SourceObjectColumn): number {
  const type = column.type.trim().toLowerCase();
  if (['boolean', 'bool'].includes(type)) return 1;
  if (['smallint', 'int2'].includes(type)) return 2;
  if (['integer', 'int', 'int4', 'serial', 'serial4', 'real', 'float4', 'date'].includes(type)) {
    return 4;
  }
  if (
    [
      'bigint',
      'int8',
      'bigserial',
      'serial8',
      'double precision',
      'float8',
      'time',
      'time without time zone',
      'time with time zone',
      'timestamp',
      'timestamp without time zone',
      'timestamp with time zone',
      'timestamptz',
    ].includes(type)
  ) {
    return 8;
  }
  if (['numeric', 'decimal', 'money', 'uuid'].includes(type)) return 16;
  if (['json', 'jsonb', 'xml', 'bytea', 'binary', 'variant'].includes(type)) {
    return LARGE_VARIABLE_WIDTH_BYTES;
  }
  return DEFAULT_VARIABLE_WIDTH_BYTES;
}

export function estimatePostgresRowWidth(columns: readonly SourceObjectColumn[]): number {
  const nullBitmapBytes = Math.ceil(columns.length / 8);
  return (
    POSTGRES_TUPLE_HEADER_BYTES +
    nullBitmapBytes +
    columns.reduce((total, column) => total + estimatePostgresColumnWidth(column), 0)
  );
}

export function buildPostgresSourceObjectMetricEvidence(
  input: Readonly<{
    observedAt: string;
    rowCount: PostgresRowCountEvidence;
    byteSize: number | null;
    columns: readonly SourceObjectColumn[];
  }>
): SourceObjectMetricEvidence {
  if (input.byteSize !== null) {
    return createSourceObjectMetricEvidence({
      observedAt: input.observedAt,
      observationScope: { kind: 'snapshot' },
      rowCount: input.rowCount,
      byteSize: {
        value: input.byteSize,
        provenance: 'measured',
        method: 'provider-storage-metadata',
        confidence: 'exact',
        basis: 'physical-allocation',
      },
    });
  }

  const rowWidth = estimatePostgresRowWidth(input.columns);
  return createSourceObjectMetricEvidence({
    observedAt: input.observedAt,
    observationScope: { kind: 'snapshot' },
    rowCount: input.rowCount,
    byteSize: {
      value: Math.ceil(input.rowCount.value * rowWidth),
      provenance: 'estimated',
      method: 'schema-width',
      confidence: 'low',
      basis: input.columns.length > 0 ? 'provider-row-storage' : 'lower-bound',
    },
  });
}
