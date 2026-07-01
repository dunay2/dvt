/** Owned concern: project graph node operational summary metrics from recorded data. */
import type {
  GraphNodeCardMetric,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import {
  buildGraphNodeOperationalDetail,
  formatBytes,
  formatCompactNumber,
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
