/** Owned concern: project graph node operational summary metrics from recorded data. */
import type {
  GraphNodeCardMetric,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import {
  buildGraphNodeOperationalDetail,
  formatBytes,
  formatCompactNumber,
  numericValue,
  pushOperationalMetric,
  resolveRuntimeDurationLabel,
  stringValue,
} from './graphNodeCardStrategyUtils';

export type GraphNodeOperationalSummary = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
  detail: GraphNodeOperationalDetail | null;
}>;

export type GraphNodeOperationalSummaryInput = Readonly<{
  title: string;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  runtimeData?: Record<string, unknown>;
  rowCount: number | null;
  byteSize: number | null;
}>;

function firstNumericValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value = numericValue(metadata[key]) ?? numericValue(data[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function formatMinutes(value: number): string {
  return `${formatCompactNumber(value)} min`;
}

function formatCadenceMinutes(value: number): string {
  return `Every ${formatCompactNumber(value)} min`;
}

function formatThroughputBytesPerMinute(value: number): string {
  return `${formatBytes(value)}/min`;
}

function resolveSchemaDriftLabel(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): string | null {
  const driftStatus =
    stringValue(metadata.schemaDriftStatus) ??
    stringValue(data.schemaDriftStatus) ??
    stringValue(metadata.schemaDrift) ??
    stringValue(data.schemaDrift);
  if (!driftStatus) {
    return null;
  }

  switch (driftStatus.toLowerCase()) {
    case 'ok':
    case 'clean':
    case 'none':
    case 'no-drift':
    case 'no_drift':
      return 'No drift detected';
    case 'detected':
    case 'drift':
    case 'drifted':
    case 'warning':
    case 'warn':
      return 'Drift detected';
    default:
      return driftStatus;
  }
}

function buildSourceHealthRows(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  rowCount: number | null,
  byteSize: number | null
): {
  hasSourceHealthSignal: boolean;
  railMetrics: GraphNodeCardMetric[];
  detailRows: GraphNodeCardMetric[];
} {
  const freshnessMinutes = firstNumericValue(metadata, data, [
    'freshnessMinutes',
    'freshnessAgeMinutes',
  ]);
  const cadenceMinutes = firstNumericValue(metadata, data, ['cadenceMinutes', 'scheduleMinutes']);
  const throughputBytesPerMinute = firstNumericValue(metadata, data, [
    'throughputBytesPerMinute',
    'bytesPerMinute',
  ]);
  const datasetSizeBytes =
    firstNumericValue(metadata, data, ['datasetSizeBytes', 'sourceSizeBytes']) ?? byteSize;
  const schemaDriftLabel = resolveSchemaDriftLabel(metadata, data);
  const hasExplicitDatasetSize =
    firstNumericValue(metadata, data, ['datasetSizeBytes', 'sourceSizeBytes']) !== null;
  const hasSourceHealthSignal =
    freshnessMinutes !== null ||
    cadenceMinutes !== null ||
    throughputBytesPerMinute !== null ||
    hasExplicitDatasetSize ||
    schemaDriftLabel !== null;
  const railMetrics: GraphNodeCardMetric[] = [];
  const detailRows: GraphNodeCardMetric[] = [];

  pushOperationalMetric(
    railMetrics,
    'freshness',
    'Freshness',
    freshnessMinutes == null ? null : formatMinutes(freshnessMinutes)
  );
  pushOperationalMetric(
    railMetrics,
    'cadence',
    'Cadence',
    cadenceMinutes == null ? null : formatCadenceMinutes(cadenceMinutes)
  );
  pushOperationalMetric(
    railMetrics,
    'throughput',
    'Throughput',
    throughputBytesPerMinute == null
      ? null
      : formatThroughputBytesPerMinute(throughputBytesPerMinute)
  );
  pushOperationalMetric(
    railMetrics,
    'size',
    'Size',
    datasetSizeBytes == null ? null : formatBytes(datasetSizeBytes)
  );

  detailRows.push(...railMetrics);
  pushOperationalMetric(
    detailRows,
    'rows',
    'Rows',
    rowCount == null ? null : formatCompactNumber(rowCount)
  );
  pushOperationalMetric(detailRows, 'schema-drift', 'Schema drift', schemaDriftLabel);

  return { hasSourceHealthSignal, railMetrics, detailRows };
}

export function buildGraphNodeOperationalSummary({
  title,
  metadata,
  data,
  runtimeData = data,
  rowCount,
  byteSize,
}: GraphNodeOperationalSummaryInput): GraphNodeOperationalSummary {
  const metrics: GraphNodeCardMetric[] = [];
  const lastRunAt = stringValue(metadata.lastRunAt) ?? stringValue(data.lastRunAt);
  const durationLabel = resolveRuntimeDurationLabel(metadata, runtimeData);
  const sourceHealth = buildSourceHealthRows(metadata, data, rowCount, byteSize);

  if (sourceHealth.hasSourceHealthSignal) {
    return {
      metrics: sourceHealth.railMetrics,
      detail: buildGraphNodeOperationalDetail(title, sourceHealth.detailRows),
    };
  }

  if (lastRunAt || durationLabel) {
    pushOperationalMetric(metrics, 'last-run', 'Last run', lastRunAt);
    pushOperationalMetric(metrics, 'duration', 'Duration', durationLabel);
    pushOperationalMetric(
      metrics,
      'rows',
      'Rows',
      rowCount == null ? null : formatCompactNumber(rowCount)
    );
  } else {
    pushOperationalMetric(
      metrics,
      'rows',
      'Rows',
      rowCount == null ? null : formatCompactNumber(rowCount)
    );
    pushOperationalMetric(metrics, 'size', 'Size', byteSize == null ? null : formatBytes(byteSize));
  }

  return {
    metrics,
    detail: buildGraphNodeOperationalDetail(title, metrics),
  };
}
