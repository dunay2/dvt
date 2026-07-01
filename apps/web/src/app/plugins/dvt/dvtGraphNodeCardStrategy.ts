/** Owned concern: project DVT transformation nodes into operational graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import { buildGraphNodeOperationalSummary } from '../graph/graphNodeOperationalSummary';
import { buildGraphNodeTitlePresentation } from '../graph/graphNodeTitlePresentation';
import {
  formatBytes,
  formatCompactNumber,
  metadataOf,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  resolveNodeCardAccentTone,
  resolveNodeCardStatus,
  resolveColumnCount,
  resolveGraphNodeRelationPath,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';

function buildDvtSubtitle(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  fallback: string | undefined
): string | null {
  return resolveGraphNodeRelationPath(metadata, data) ?? fallback ?? null;
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
  const rowCount = numericValue(metadata.rowCount) ?? numericValue(data.rowCount);
  const byteSize =
    numericValue(metadata.byteSize) ?? numericValue(metadata.bytes) ?? numericValue(data.byteSize);
  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
  const runtimeData = {
    ...data,
    durationMs: numericValue(data.durationMs) ?? resolveCanonicalDurationMs(node, metadata, data),
  };

  pushMetric(metrics, 'rows', 'Rows', rowCount == null ? null : formatCompactNumber(rowCount));
  pushMetric(metrics, 'bytes', 'Size', byteSize == null ? null : formatBytes(byteSize));
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));
  pushRuntimeMetrics(metrics, metadata, runtimeData);
  pushCanonicalCostMetric(metrics, node, metadata, data);

  const operationalSummary = buildGraphNodeOperationalSummary({
    title: titlePresentation.title,
    metadata,
    data,
    runtimeData,
    rowCount,
    byteSize,
  });

  return {
    title: titlePresentation.title,
    technicalName: titlePresentation.technicalName,
    subtitle: buildDvtSubtitle(metadata, data, node.path),
    path: buildDvtSubtitle(metadata, data, node.path),
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    accentTone: resolveNodeCardAccentTone(node),
    status: resolveNodeCardStatus(
      node,
      metadata,
      data,
      node.role === 'input'
        ? { label: 'Ready', tone: 'success' }
        : { label: 'Draft', tone: 'warning' }
    ),
    metrics,
    operationalMetrics: operationalSummary.metrics,
    operationalDetail: operationalSummary.detail,
  };
}

export const dvtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dvt-card',
  matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
  build: buildDvtCard,
};
