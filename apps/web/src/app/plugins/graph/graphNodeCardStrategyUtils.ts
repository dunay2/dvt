/** Owned concern: share pure graph card projection helpers across plugin strategies. */
import type { CanonicalNode } from '../../types/canonical';
import {
  isCanvasNodePresentationCopy,
  isCanvasNodePresentationTruth,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import { formatSourceObjectMetricByteSize } from '../../services/workspace/sourceObjectMetricEvidencePresentation';
import type {
  GraphNodeCardAccentTone,
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
  GraphNodeCardStatus,
  GraphNodeCardStatusTone,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';

type PushMetricOptions = Readonly<{
  detail?: string;
  icon?: GraphNodeCardMetricIcon;
  tone?: GraphNodeCardStatusTone;
}>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function metadataOf(node: CanonicalNode): Record<string, unknown> {
  return isRecord(node.metadata) ? node.metadata : {};
}

export function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

export const formatBytes = formatSourceObjectMetricByteSize;

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

type GraphNodeRelationParts = Readonly<{
  database: string | null;
  schema: string | null;
  table: string | null;
}>;

export function resolveGraphNodeRelationParts(
  metadata: Record<string, unknown>,
  data: Record<string, unknown> = {}
): GraphNodeRelationParts {
  const configMetadata = recordValue(metadata.config);
  const dbtMetadata = recordValue(metadata.dbt);
  const configData = recordValue(data.config);
  const dbtData = recordValue(data.dbt);

  return {
    database:
      stringValue(metadata.database) ??
      stringValue(configMetadata.database) ??
      stringValue(dbtMetadata.database) ??
      stringValue(dbtMetadata.databaseName) ??
      stringValue(data.database) ??
      stringValue(configData.database) ??
      stringValue(dbtData.database) ??
      stringValue(dbtData.databaseName),
    schema:
      stringValue(metadata.schema) ??
      stringValue(configMetadata.schema) ??
      stringValue(dbtMetadata.schema) ??
      stringValue(dbtMetadata.schemaName) ??
      stringValue(data.schema) ??
      stringValue(configData.schema) ??
      stringValue(dbtData.schema) ??
      stringValue(dbtData.schemaName),
    table:
      stringValue(metadata.tableName) ??
      stringValue(metadata.table) ??
      stringValue(configMetadata.tableName) ??
      stringValue(configMetadata.table) ??
      stringValue(dbtMetadata.tableName) ??
      stringValue(dbtMetadata.table) ??
      stringValue(data.tableName) ??
      stringValue(data.table) ??
      stringValue(configData.tableName) ??
      stringValue(configData.table) ??
      stringValue(dbtData.tableName) ??
      stringValue(dbtData.table),
  };
}

export function resolveGraphNodeRelationPath(
  metadata: Record<string, unknown>,
  data: Record<string, unknown> = {}
): string | null {
  const { database, schema, table } = resolveGraphNodeRelationParts(metadata, data);
  const relation = [database, schema, table].filter(Boolean).join('.');
  return relation.length > 0 ? relation : null;
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

export function resolveNodeCardAccentTone(node: CanonicalNode): GraphNodeCardAccentTone {
  if (node.kind.includes(':source')) {
    return 'source';
  }
  if (node.kind.includes(':test')) {
    return 'test';
  }
  if (node.kind.includes(':exposure') || node.kind.includes(':sink')) {
    return 'output';
  }
  if (node.kind.includes(':macro')) {
    return 'control';
  }
  if (
    node.kind.includes(':model') ||
    node.kind.includes(':snapshot') ||
    node.kind.includes(':seed') ||
    node.kind.includes(':sql_transform')
  ) {
    return 'model';
  }
  switch (node.role) {
    case 'input':
      return 'source';
    case 'check':
      return 'test';
    case 'output':
      return 'output';
    case 'control':
      return 'control';
    case 'transform':
      return 'model';
    default:
      return 'unknown';
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
  return resolveColumnMetricPresentation(metadata, data).count;
}

export type GraphNodeColumnMetricPresentation = Readonly<{
  count: number;
  label: string;
  detail?: string;
}>;

function interpolateCount(template: string, count: number): string {
  return template.replaceAll('{count}', String(count));
}

export function resolveColumnMetricPresentation(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): GraphNodeColumnMetricPresentation {
  const truth = isCanvasNodePresentationTruth(data.presentationTruth)
    ? data.presentationTruth
    : null;
  const copy = isCanvasNodePresentationCopy(data.presentationCopy) ? data.presentationCopy : null;
  const count =
    truth?.columns.visibleCount ?? arrayCount(data.columns) ?? arrayCount(metadata.columns) ?? 0;

  if (truth == null || copy == null) {
    return { count, label: copy?.columnsLabel ?? 'Columns' };
  }

  const detail =
    truth.columns.visibleProvenance === 'declared'
      ? interpolateCount(copy.declaredColumnsDetailTemplate, count)
      : truth.columns.visibleProvenance === 'inherited'
        ? interpolateCount(copy.inheritedColumnsDetailTemplate, count)
        : copy.noColumnsDetail;

  return { count, label: copy.columnsLabel, detail };
}
