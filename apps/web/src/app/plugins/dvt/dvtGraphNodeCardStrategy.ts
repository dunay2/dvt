/** Owned concern: project DVT transformation nodes into operational graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import { graphNodeCardCopyTokens } from '../graph/graphNodeCardCopyTokens';
import { buildGraphNodeOperationalSummary } from '../graph/graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from '../graph/graphNodeSourceMetricProjection';
import { buildGraphNodeTitlePresentation } from '../graph/graphNodeTitlePresentation';
import {
  metadataOf,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  resolveNodeCardAccentTone,
  resolveNodeCardStatus,
  resolveColumnCount,
  resolveColumnMetricPresentation,
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

function buildDvtArtifactPath(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  fallback: string | undefined
): string | null {
  return fallback ?? resolveGraphNodeRelationPath(metadata, data) ?? null;
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
  const isSourceObject = node.role === 'input' || node.kind.endsWith(':source');
  const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
    isSourceObject,
    metadata,
    data,
  });
  const columnPresentation = resolveColumnMetricPresentation(metadata, data);
  const columnCount = columnPresentation.count;
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

  pushMetric(metrics, 'columns', columnPresentation.label, resolveColumnCount(metadata, data), {
    ...(columnPresentation.detail == null ? {} : { detail: columnPresentation.detail }),
  });
  pushRuntimeMetrics(metrics, metadata, runtimeData);
  pushCanonicalCostMetric(metrics, node, metadata, data);

  const operationalSummary = buildGraphNodeOperationalSummary({
    projectionKind: isSourceObject ? 'source' : 'execution',
    title: titlePresentation.title,
    metadata,
    data,
    runtimeData,
    volumeMetricProjection,
    columnCount,
  });

  return {
    title: titlePresentation.title,
    technicalName: titlePresentation.technicalName,
    subtitle: buildDvtSubtitle(metadata, data, node.path),
    path: buildDvtArtifactPath(metadata, data, node.path),
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
    nodeActionsLabel: graphNodeCardCopyTokens.nodeActionsLabel,
  };
}

export const dvtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dvt-card',
  matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
  build: buildDvtCard,
};
