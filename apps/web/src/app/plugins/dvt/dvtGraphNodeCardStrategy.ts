/** Owned concern: project DVT transformation nodes into operational graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import {
  graphNodeCardCopyTokens,
  resolveGraphNodeCardCopy,
} from '../graph/graphNodeCardCopyTokens';
import { buildGraphNodeOperationalSummary } from '../graph/graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from '../graph/graphNodeSourceMetricProjection';
import { buildGraphNodeTitlePresentation } from '../graph/graphNodeTitlePresentation';
import {
  metadataOf,
  buildGraphNodeSourceIdentity,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  resolveCodeMetricPresentation,
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  resolveColumnCount,
  resolveColumnMetricPresentation,
  resolveGraphNodeRelationPath,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';
import { isCanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';

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
  const presentationCopy = isCanvasNodePresentationCopy(data.presentationCopy)
    ? data.presentationCopy
    : null;
  const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
    isSourceObject,
    metadata,
    data,
    locale: presentationCopy?.locale,
  });
  const columnPresentation = resolveColumnMetricPresentation(metadata, data);
  const codePresentation = resolveCodeMetricPresentation(data);
  const columnCount = columnPresentation.count;
  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
  const title =
    node.pluginId === 'dvt.warehouse-source' && node.kind === 'dvt:source' && node.name !== node.id
      ? node.name
      : titlePresentation.title;
  const runtimeData = {
    ...data,
    durationMs: numericValue(data.durationMs) ?? resolveCanonicalDurationMs(node, metadata, data),
  };

  pushMetric(metrics, 'code', codePresentation?.label ?? 'Code', codePresentation?.value ?? null, {
    ...(codePresentation?.detail == null ? {} : { detail: codePresentation.detail }),
  });
  pushMetric(metrics, 'columns', columnPresentation.label, resolveColumnCount(metadata, data), {
    ...(columnPresentation.detail == null ? {} : { detail: columnPresentation.detail }),
  });
  pushRuntimeMetrics(metrics, metadata, runtimeData);
  pushCanonicalCostMetric(metrics, node, metadata, data);

  const operationalSummary = buildGraphNodeOperationalSummary({
    projectionKind: isSourceObject ? 'source' : 'execution',
    title,
    metadata,
    data,
    runtimeData,
    volumeMetricProjection,
    columnCount,
    locale: presentationCopy?.locale,
  });
  const operationalCopy = resolveGraphNodeCardCopy(presentationCopy?.locale);
  const projectedRows = volumeMetricProjection.metrics.find((metric) => metric.id === 'rows');
  const projectedSize = volumeMetricProjection.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const currentRows = operationalSummary.metrics.find((metric) => metric.id === 'rows');
  const currentSize = operationalSummary.metrics.find((metric) => metric.id === 'size');
  const operationalMetrics =
    node.kind === 'dvt:sql_transform'
      ? [
          ...operationalSummary.metrics.filter(
            (metric) => metric.id !== 'rows' && metric.id !== 'size'
          ),
          projectedRows == null
            ? (currentRows ?? {
                id: 'rows',
                label: operationalCopy.rowsLabel,
                value: operationalCopy.notCalculatedLabel,
                icon: 'rows' as const,
              })
            : { ...projectedRows, id: 'rows', icon: 'rows' as const },
          projectedSize == null
            ? (currentSize ?? {
                id: 'size',
                label: operationalCopy.sizeLabel,
                value: operationalCopy.notCalculatedLabel,
                icon: 'database' as const,
              })
            : { ...projectedSize, id: 'size', icon: 'database' as const },
        ]
      : operationalSummary.metrics;

  return {
    title,
    technicalName: titlePresentation.technicalName,
    subtitle: buildDvtSubtitle(metadata, data, node.path),
    path: buildDvtArtifactPath(metadata, data, node.path),
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(
      node,
      metadata,
      data,
      node.role === 'input'
        ? { label: presentationCopy?.readyStatusLabel ?? 'Ready', tone: 'healthy' }
        : { label: presentationCopy?.draftStatusLabel ?? 'Draft', tone: 'neutral' }
    ),
    metrics,
    operationalMetrics,
    operationalDetail: operationalSummary.detail,
    sourceIdentity: buildGraphNodeSourceIdentity(node, metadata, title, presentationCopy?.locale),
    nodeActionsLabel:
      presentationCopy?.nodeActionsLabel ?? graphNodeCardCopyTokens.nodeActionsLabel,
  };
}

export const dvtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dvt-card',
  matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
  build: buildDvtCard,
};
