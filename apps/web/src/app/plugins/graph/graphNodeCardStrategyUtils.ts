/** Owned concern: share pure graph card projection helpers across plugin strategies. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetricIcon,
  GraphNodeCardMetric,
  GraphNodeCardStatus,
  GraphNodeCardStatusTone,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';

type PushMetricOptions = Readonly<{
  icon?: GraphNodeCardMetricIcon;
  tone?: GraphNodeCardStatusTone;
}>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function metadataOf(node: CanonicalNode): Record<string, unknown> {
  return isRecord(node.metadata) ? node.metadata : {};
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function numericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function arrayCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

export function formatBytes(value: number): string {
  if (Math.abs(value) >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  if (Math.abs(value) >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }
  if (Math.abs(value) >= 1024) {
    return `${(value / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${value} B`;
}

export function formatDurationMs(value: number): string {
  const totalSeconds = Math.max(0, Math.round(value / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return remainingSeconds === 0 ? `${totalMinutes}m` : `${totalMinutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export function pushRuntimeMetrics(
  metrics: GraphNodeCardMetric[],
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): void {
  const runStatus = stringValue(metadata.runStatus) ?? stringValue(data.runStatus);
  const lastRunAt = stringValue(metadata.lastRunAt) ?? stringValue(data.lastRunAt);
  const durationMs = numericValue(metadata.durationMs) ?? numericValue(data.durationMs);
  const warningCount =
    numericValue(metadata.warningCount) ??
    numericValue(data.warningCount) ??
    arrayCount(metadata.warnings) ??
    arrayCount(data.warnings);

  pushMetric(metrics, 'status', 'Status', runStatus);
  pushMetric(metrics, 'last-run', 'Last run', lastRunAt);
  pushMetric(
    metrics,
    'duration',
    'Duration',
    durationMs == null ? null : formatDurationMs(durationMs)
  );
  pushMetric(
    metrics,
    'warnings',
    'Warnings',
    warningCount == null ? null : formatCompactNumber(warningCount)
  );
}

export function pushOperationalMetric(
  metrics: GraphNodeCardMetric[],
  id: string,
  label: string,
  value: string | number | null,
  options?: PushMetricOptions
): void {
  pushMetric(metrics, id, label, value, options);
}

export function buildGraphNodeOperationalDetail(
  title: string,
  metrics: readonly GraphNodeCardMetric[]
): GraphNodeOperationalDetail | null {
  if (metrics.length === 0) {
    return null;
  }

  return {
    title: `${title} health`,
    ariaLabel: `Open ${title} health metrics`,
    rows: metrics,
  };
}

export function resolveRuntimeDurationLabel(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): string | null {
  const durationMs = numericValue(metadata.durationMs) ?? numericValue(data.durationMs);
  return durationMs == null ? null : formatDurationMs(durationMs);
}

export function resolveRunStatusLabel(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): GraphNodeCardStatus | null {
  const runStatus = stringValue(metadata.runStatus) ?? stringValue(data.runStatus);
  if (!runStatus) {
    return null;
  }

  switch (runStatus.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'succeeded':
      return { label: 'Completed', tone: 'success' };
    case 'running':
      return { label: 'Running', tone: 'running' };
    case 'failed':
    case 'error':
      return { label: 'Failed', tone: 'danger' };
    case 'blocked':
      return { label: 'Blocked', tone: 'danger' };
    default:
      return { label: runStatus, tone: 'neutral' };
  }
}

export function resolveNodeCardStatus(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  fallback: GraphNodeCardStatus = { label: 'Draft', tone: 'warning' }
): GraphNodeCardStatus {
  const runtimeStatus = resolveRunStatusLabel(metadata, data);
  if (runtimeStatus) {
    return runtimeStatus;
  }

  switch (node.status) {
    case 'success':
      return { label: 'Ready', tone: 'success' };
    case 'running':
      return { label: 'Running', tone: 'running' };
    case 'failed':
      return { label: 'Failed', tone: 'danger' };
    case 'warn':
      return { label: 'Warning', tone: 'warning' };
    case 'skipped':
      return { label: 'Skipped', tone: 'warning' };
    default:
      return fallback;
  }
}

export function pushMetric(
  metrics: GraphNodeCardMetric[],
  id: string,
  label: string,
  value: string | number | null,
  options?: PushMetricOptions
): void {
  if (value === null) {
    return;
  }
  metrics.push({ id, label, value: String(value), ...options });
}

export function resolveColumnCount(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): number {
  return arrayCount(data.columns) ?? arrayCount(metadata.columns) ?? 0;
}
