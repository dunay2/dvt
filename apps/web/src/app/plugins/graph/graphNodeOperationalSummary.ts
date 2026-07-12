/** Owned concern: project graph node operational summary metrics from recorded data. */
import type {
  GraphNodeCardMetric,
  GraphNodeCardStatusTone,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import type {
  GraphNodeSizeEvidenceProjection,
  GraphNodeVolumeMetricProjection,
} from './graphNodeSourceMetricProjection';
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
  projectionKind: 'source' | 'execution';
  title: string;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  runtimeData?: Record<string, unknown>;
  volumeMetricProjection: GraphNodeVolumeMetricProjection;
  columnCount: number | null;
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

function formatAverageBytes(value: number): string {
  if (Math.abs(value) < 1024) {
    return `${value.toFixed(1).replace(/\.0$/, '')} B`;
  }
  return formatBytes(value);
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

type SchemaDriftProjection = Readonly<{
  label: string;
  tone: GraphNodeCardStatusTone;
}>;

function sizeEvidenceTone(sizeEvidence: GraphNodeSizeEvidenceProjection): GraphNodeCardStatusTone {
  return sizeEvidence.provenance === 'measured' ? 'success' : 'warning';
}

function resolveSchemaDriftProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): SchemaDriftProjection | null {
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
      return { label: 'No drift detected', tone: 'success' };
    case 'detected':
    case 'drift':
    case 'drifted':
    case 'warning':
    case 'warn':
      return { label: 'Drift detected', tone: 'warning' };
    default:
      return { label: driftStatus, tone: 'neutral' };
  }
}

function buildSourceHealthRows(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  volumeMetricProjection: GraphNodeVolumeMetricProjection,
  columnCount: number | null
): {
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
  const { rowCount, sizeEvidence } = volumeMetricProjection;
  const rowMetric = volumeMetricProjection.metrics.find((metric) => metric.id === 'rows');
  const sizeMetric = volumeMetricProjection.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const schemaDrift = resolveSchemaDriftProjection(metadata, data);
  const railMetrics: GraphNodeCardMetric[] = [];
  const detailRows: GraphNodeCardMetric[] = [];

  pushOperationalMetric(
    railMetrics,
    'freshness',
    'Freshness',
    freshnessMinutes == null ? null : formatMinutes(freshnessMinutes),
    { icon: 'clock' }
  );
  pushOperationalMetric(railMetrics, 'last-refresh', 'Last refresh', lastRefreshAt, {
    icon: 'refresh',
  });
  pushOperationalMetric(
    railMetrics,
    'cadence',
    'Cadence',
    cadenceMinutes == null ? null : formatCadenceMinutes(cadenceMinutes),
    { icon: 'refresh' }
  );
  pushOperationalMetric(
    railMetrics,
    'throughput',
    'Throughput',
    throughputBytesPerMinute == null
      ? null
      : formatThroughputBytesPerMinute(throughputBytesPerMinute),
    { icon: 'throughput' }
  );
  pushOperationalMetric(
    railMetrics,
    'rows',
    'Rows',
    rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
    {
      icon: 'rows',
      ...(rowMetric?.detail == null ? {} : { detail: rowMetric.detail }),
      ...(rowMetric?.tone == null ? {} : { tone: rowMetric.tone }),
    }
  );
  pushOperationalMetric(
    railMetrics,
    'size',
    sizeEvidence?.provenance === 'estimated' ? 'Est. size' : 'Size',
    sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes),
    sizeEvidence == null
      ? { icon: 'database' }
      : {
          icon: 'database',
          tone: sizeEvidenceTone(sizeEvidence),
          ...(sizeMetric?.detail == null ? {} : { detail: sizeMetric.detail }),
        }
  );

  const schemaDriftRailOnly = railMetrics.length === 0 && schemaDrift !== null;
  if (schemaDriftRailOnly) {
    pushOperationalMetric(railMetrics, 'schema-drift', 'Schema drift', schemaDrift.label, {
      icon: 'drift',
      tone: schemaDrift.tone,
    });
  }

  detailRows.push(...railMetrics);
  if (sizeEvidence !== null && !railMetrics.some((metric) => metric.id === 'columns')) {
    pushOperationalMetric(
      detailRows,
      'columns',
      'Columns',
      columnCount == null ? null : formatCompactNumber(columnCount),
      { icon: 'columns' }
    );
  }
  pushByteLevelDetailRows(detailRows, rowCount, sizeEvidence, sizeMetric?.detail);
  if (!railMetrics.some((metric) => metric.id === 'rows')) {
    pushOperationalMetric(
      detailRows,
      'rows',
      'Rows',
      rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
      {
        icon: 'rows',
        ...(rowMetric?.detail == null ? {} : { detail: rowMetric.detail }),
        ...(rowMetric?.tone == null ? {} : { tone: rowMetric.tone }),
      }
    );
  }
  if (!schemaDriftRailOnly) {
    pushOperationalMetric(
      detailRows,
      'schema-drift',
      'Schema drift',
      schemaDrift?.label ?? null,
      schemaDrift == null ? undefined : { icon: 'drift', tone: schemaDrift.tone }
    );
  }

  return { railMetrics, detailRows };
}

function detailedSizeLabel(sizeEvidence: GraphNodeSizeEvidenceProjection | null): string {
  if (sizeEvidence?.basis === 'physical-allocation') {
    return 'Allocated size';
  }
  if (sizeEvidence?.basis === 'lower-bound') {
    return 'Minimum size';
  }
  return sizeEvidence?.provenance === 'estimated' ? 'Estimated payload size' : 'Dataset size';
}

function pushByteLevelDetailRows(
  detailRows: GraphNodeCardMetric[],
  rowCount: number | null,
  sizeEvidence: GraphNodeSizeEvidenceProjection | null,
  detail?: string
): void {
  pushOperationalMetric(
    detailRows,
    'dataset-size',
    detailedSizeLabel(sizeEvidence),
    sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes),
    sizeEvidence == null
      ? { icon: 'database' }
      : {
          icon: 'database',
          tone: sizeEvidenceTone(sizeEvidence),
          ...(detail == null ? {} : { detail }),
        }
  );
  pushOperationalMetric(detailRows, 'observed-at', 'Observed', sizeEvidence?.observedAt ?? null, {
    icon: 'clock',
  });

  const averageRowSize =
    rowCount == null ||
    rowCount <= 0 ||
    sizeEvidence == null ||
    sizeEvidence.basis !== 'logical-payload'
      ? null
      : sizeEvidence.bytes / rowCount;
  pushOperationalMetric(
    detailRows,
    'avg-row-size',
    sizeEvidence?.provenance === 'estimated' ? 'Est. avg row size' : 'Avg row size',
    averageRowSize == null ? null : formatAverageBytes(averageRowSize),
    sizeEvidence == null
      ? { icon: 'throughput' }
      : { icon: 'throughput', tone: sizeEvidenceTone(sizeEvidence) }
  );
}

function buildAdditionalOperationalDetail(
  title: string,
  railMetrics: readonly GraphNodeCardMetric[],
  detailRows: readonly GraphNodeCardMetric[]
): GraphNodeOperationalDetail | null {
  const railMetricIds = new Set(railMetrics.map((metric) => metric.id));
  const additionalRows = detailRows.filter((row) => !railMetricIds.has(row.id));
  return additionalRows.length > 0 ? buildGraphNodeOperationalDetail(title, additionalRows) : null;
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
    lastRunMinutesAgo == null ? lastRunAt : formatMinutes(lastRunMinutesAgo),
    { icon: 'clock' }
  );
  pushOperationalMetric(metrics, 'duration', 'Duration', durationLabel, { icon: 'timer' });
  pushOperationalMetric(
    metrics,
    'rows',
    'Rows',
    rowCount == null ? null : formatCompactNumber(rowCount),
    { icon: 'rows' }
  );
  pushOperationalMetric(
    metrics,
    'cost',
    'Cost',
    costUsd == null ? costLabel : formatCost(costUsd),
    {
      icon: 'cost',
    }
  );
  pushOperationalMetric(metrics, 'tests', 'Tests', testStatus);

  return metrics;
}

export function buildGraphNodeOperationalSummary({
  projectionKind,
  title,
  metadata,
  data,
  runtimeData = data,
  volumeMetricProjection,
  columnCount,
}: GraphNodeOperationalSummaryInput): GraphNodeOperationalSummary {
  const metrics: GraphNodeCardMetric[] = [];
  const { rowCount, sizeEvidence } = volumeMetricProjection;
  const volumeRowMetric = volumeMetricProjection.metrics.find((metric) => metric.id === 'rows');
  const volumeSizeMetric = volumeMetricProjection.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const sourceHealth = buildSourceHealthRows(metadata, data, volumeMetricProjection, columnCount);
  const modelExecutionMetrics = buildModelExecutionMetrics(metadata, data, runtimeData, rowCount);

  if (projectionKind === 'source') {
    return {
      metrics: sourceHealth.railMetrics,
      detail: buildAdditionalOperationalDetail(
        title,
        sourceHealth.railMetrics,
        sourceHealth.detailRows
      ),
    };
  }

  const hasModelExecutionMetrics = modelExecutionMetrics.length > 0;
  if (hasModelExecutionMetrics) {
    metrics.push(...modelExecutionMetrics);
  } else {
    pushOperationalMetric(
      metrics,
      'rows',
      'Rows',
      rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
      {
        icon: 'rows',
        ...(volumeRowMetric?.detail == null ? {} : { detail: volumeRowMetric.detail }),
        ...(volumeRowMetric?.tone == null ? {} : { tone: volumeRowMetric.tone }),
      }
    );
    pushOperationalMetric(
      metrics,
      'size',
      sizeEvidence?.provenance === 'estimated' ? 'Est. size' : 'Size',
      sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes),
      sizeEvidence == null
        ? { icon: 'database' }
        : {
            icon: 'database',
            tone: sizeEvidenceTone(sizeEvidence),
            ...(volumeSizeMetric?.detail == null ? {} : { detail: volumeSizeMetric.detail }),
          }
    );
  }

  const staticDetailRows: GraphNodeCardMetric[] = [];
  if (!hasModelExecutionMetrics && sizeEvidence !== null) {
    pushOperationalMetric(
      staticDetailRows,
      'columns',
      'Columns',
      columnCount == null ? null : formatCompactNumber(columnCount),
      { icon: 'columns' }
    );
    pushByteLevelDetailRows(staticDetailRows, rowCount, sizeEvidence, volumeSizeMetric?.detail);
  }

  return {
    metrics,
    detail: buildGraphNodeOperationalDetail(title, staticDetailRows),
  };
}
