/** Owned concern: project DVT transformation nodes into operational graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import {
  formatBytes,
  formatCompactNumber,
  metadataOf,
  numericValue,
  pushOperationalMetric,
  pushMetric,
  pushRuntimeMetrics,
  resolveNodeCardStatus,
  resolveColumnCount,
  resolveRuntimeDurationLabel,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';

function buildDvtSubtitle(
  metadata: Record<string, unknown>,
  fallback: string | undefined
): string | null {
  const database = stringValue(metadata.database);
  const schema = stringValue(metadata.schema);
  const table = stringValue(metadata.table);
  const path = [database, schema, table].filter(Boolean).join('.');
  return path.length > 0 ? path : (fallback ?? null);
}

function resolveCanonicalDurationMs(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): number | null {
  if (numericValue(metadata.durationMs) != null || numericValue(data.durationMs) != null) {
    return null;
  }

  const durationSeconds = node.lastDuration ?? numericValue(data.lastDuration);
  return durationSeconds == null ? null : durationSeconds * 1000;
}

function pushCanonicalCostMetric(
  metrics: GraphNodeCardMetric[],
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): void {
  const cost =
    numericValue(metadata.cost) ??
    numericValue(metadata.lastCost) ??
    numericValue(data.lastCost) ??
    node.lastCost ??
    null;

  pushMetric(metrics, 'cost', 'Cost', cost == null ? null : `$${cost.toFixed(2)}`);
}

function buildDvtCard(node: CanonicalNode, data: Record<string, unknown>): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const metrics: GraphNodeCardMetric[] = [];
  const operationalMetrics: GraphNodeCardMetric[] = [];
  const rowCount = numericValue(metadata.rowCount) ?? numericValue(data.rowCount);
  const byteSize =
    numericValue(metadata.byteSize) ?? numericValue(metadata.bytes) ?? numericValue(data.byteSize);
  const runtimeData = {
    ...data,
    durationMs: numericValue(data.durationMs) ?? resolveCanonicalDurationMs(node, metadata, data),
  };

  pushMetric(metrics, 'rows', 'Rows', rowCount == null ? null : formatCompactNumber(rowCount));
  pushMetric(metrics, 'bytes', 'Size', byteSize == null ? null : formatBytes(byteSize));
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));
  pushRuntimeMetrics(metrics, metadata, runtimeData);
  pushCanonicalCostMetric(metrics, node, metadata, data);

  const lastRunAt = stringValue(metadata.lastRunAt) ?? stringValue(data.lastRunAt);
  const durationLabel = resolveRuntimeDurationLabel(metadata, runtimeData);
  if (lastRunAt || durationLabel) {
    pushOperationalMetric(operationalMetrics, 'last-run', 'Last run', lastRunAt);
    pushOperationalMetric(operationalMetrics, 'duration', 'Duration', durationLabel);
    pushOperationalMetric(
      operationalMetrics,
      'rows',
      'Rows',
      rowCount == null ? null : formatCompactNumber(rowCount)
    );
  } else {
    pushOperationalMetric(
      operationalMetrics,
      'rows',
      'Rows',
      rowCount == null ? null : formatCompactNumber(rowCount)
    );
    pushOperationalMetric(
      operationalMetrics,
      'size',
      'Size',
      byteSize == null ? null : formatBytes(byteSize)
    );
  }

  return {
    title: node.name,
    subtitle: buildDvtSubtitle(metadata, node.path),
    path: buildDvtSubtitle(metadata, node.path),
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    status: resolveNodeCardStatus(
      node,
      metadata,
      data,
      node.role === 'input'
        ? { label: 'Ready', tone: 'success' }
        : { label: 'Draft', tone: 'warning' }
    ),
    metrics,
    operationalMetrics,
  };
}

export const dvtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dvt-card',
  matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
  build: buildDvtCard,
};
