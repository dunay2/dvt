/** Owned concern: project graph node operational summary metrics from recorded data. */
import type {
  GraphNodeCardMetric,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import {
  buildGraphNodeOperationalDetail,
  formatBytes,
  formatCompactNumber,
  formatDurationMs,
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

function formatCost(value: number): string {
  return `$${value.toFixed(2)}`;
}

function firstRuntimeNumericValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value =
      numericValue(metadata[key]) ?? numericValue(data[key]) ?? numericValue(runtimeData[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function firstRuntimeStringValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value =
      stringValue(metadata[key]) ?? stringValue(data[key]) ?? stringValue(runtimeData[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
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
  const lastRefreshAt =
    stringValue(metadata.lastRefreshAt) ??
    stringValue(data.lastRefreshAt) ??
    stringValue(metadata.lastRefresh) ??
    stringValue(data.lastRefresh);
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
    lastRefreshAt !== null ||
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
  pushOperationalMetric(railMetrics, 'last-refresh', 'Last refresh', lastRefreshAt);
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

  const schemaDriftRailOnly = railMetrics.length === 0 && schemaDriftLabel !== null;
  if (schemaDriftRailOnly) {
    pushOperationalMetric(railMetrics, 'schema-drift', 'Schema drift', schemaDriftLabel);
  }

  detailRows.push(...railMetrics);
  pushOperationalMetric(
    detailRows,
    'rows',
    'Rows',
    rowCount == null ? null : formatCompactNumber(rowCount)
  );
  if (!schemaDriftRailOnly) {
    pushOperationalMetric(detailRows, 'schema-drift', 'Schema drift', schemaDriftLabel);
  }

  return { hasSourceHealthSignal, railMetrics, detailRows };
}

function buildModelExecutionMetrics(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  rowCount: number | null
): GraphNodeCardMetric[] {
  const lastRunMinutesAgo = firstRuntimeNumericValue(metadata, data, runtimeData, [
    'lastRunMinutesAgo',
    'lastRunAgeMinutes',
  ]);
  const lastRunAt = firstRuntimeStringValue(metadata, data, runtimeData, ['lastRunAt']);
  const durationSeconds = firstRuntimeNumericValue(metadata, data, runtimeData, [
    'durationSeconds',
  ]);
  const durationLabel =
    resolveRuntimeDurationLabel(metadata, runtimeData) ??
    (durationSeconds == null ? null : formatDurationMs(durationSeconds * 1000));
  const costUsd = firstRuntimeNumericValue(metadata, data, runtimeData, [
    'costUsd',
    'cost',
    'lastCost',
  ]);
  const costLabel =
    costUsd == null ? firstRuntimeStringValue(metadata, data, runtimeData, ['costLabel']) : null;
  const testStatus = firstRuntimeStringValue(metadata, data, runtimeData, [
    'testStatus',
    'testsStatus',
  ]);
  const hasModelExecutionSignal =
    lastRunMinutesAgo !== null ||
    lastRunAt !== null ||
    durationLabel !== null ||
    costUsd !== null ||
    costLabel !== null ||
    testStatus !== null;
  const metrics: GraphNodeCardMetric[] = [];

  if (!hasModelExecutionSignal) {
    return metrics;
  }

  pushOperationalMetric(
    metrics,
    'last-run',
    'Last run',
    lastRunMinutesAgo == null ? lastRunAt : formatMinutes(lastRunMinutesAgo)
  );
  pushOperationalMetric(metrics, 'duration', 'Duration', durationLabel);
  pushOperationalMetric(
    metrics,
    'rows',
    'Rows',
    rowCount == null ? null : formatCompactNumber(rowCount)
  );
  pushOperationalMetric(metrics, 'cost', 'Cost', costUsd == null ? costLabel : formatCost(costUsd));
  pushOperationalMetric(metrics, 'tests', 'Tests', testStatus);

  return metrics;
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
  const sourceHealth = buildSourceHealthRows(metadata, data, rowCount, byteSize);
  const modelExecutionMetrics = buildModelExecutionMetrics(metadata, data, runtimeData, rowCount);

  if (sourceHealth.hasSourceHealthSignal) {
    return {
      metrics: sourceHealth.railMetrics,
      detail: buildGraphNodeOperationalDetail(title, sourceHealth.detailRows),
    };
  }

  if (modelExecutionMetrics.length > 0) {
    metrics.push(...modelExecutionMetrics);
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
