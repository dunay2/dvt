/** Owned concern: project shared Source and Model product cards across authority profiles. */
import type { CanonicalNode, PluginNodeKind } from '../../types/canonical';
import { isCanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import { buildDvtGraphNodeSemanticMetric } from '../dvt/dvtGraphNodeSemanticMetric';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { buildGraphNodeOperationalSummary } from './graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';
import { buildGraphNodeTitlePresentation } from './graphNodeTitlePresentation';
import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import {
  arrayCount,
  buildGraphNodeSourceIdentity,
  metadataOf,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  resolveColumnCount,
  resolveGraphNodeRelationPath,
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  stringValue,
} from './graphNodeCardStrategyUtils';

const SHARED_SOURCE_MODEL_KINDS = new Set<PluginNodeKind>(['dvt:source', 'dvt:transform']);

export function isSharedSourceModelKind(kind: PluginNodeKind): boolean {
  return SHARED_SOURCE_MODEL_KINDS.has(kind);
}

function resolveMaterialization(metadata: Record<string, unknown>): string | null {
  const dbt = metadata.dbt;
  const dbtRecord =
    typeof dbt === 'object' && dbt !== null && !Array.isArray(dbt)
      ? (dbt as Record<string, unknown>)
      : {};
  const config = metadata.config ?? dbtRecord.config;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) return null;
  const record = config as Record<string, unknown>;
  return stringValue(record.materialized) ?? stringValue(record.materialization);
}

function containsDbtCompatibilityMetadata(metadata: Record<string, unknown>): boolean {
  return (
    metadata.authority === 'dbt-project-files' ||
    (typeof metadata.dbt === 'object' && metadata.dbt !== null && !Array.isArray(metadata.dbt))
  );
}

function resolveMaterializationIcon(value: string | null): GraphNodeCardMetricIcon | undefined {
  switch (value?.toLowerCase()) {
    case 'view':
      return 'eye';
    case 'incremental':
      return 'refresh';
    case 'table':
      return 'table';
    case 'ephemeral':
      return 'workflow';
    case 'materialized_view':
    case 'materialized-view':
      return 'database';
    default:
      return undefined;
  }
}

function buildAuthorityMetrics(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): GraphNodeCardMetric[] {
  const metrics: GraphNodeCardMetric[] = [];
  if (containsDbtCompatibilityMetadata(metadata)) {
    const materialization = resolveMaterialization(metadata);
    pushMetric(metrics, 'materialization', 'Mat.', materialization, {
      placement: 'header',
      ...(resolveMaterializationIcon(materialization) == null
        ? {}
        : { icon: resolveMaterializationIcon(materialization) }),
    });
    pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  } else {
    pushRuntimeMetrics(metrics, metadata, data);
    const cost =
      numericValue(metadata.cost) ??
      numericValue(metadata.lastCost) ??
      numericValue(data.lastCost) ??
      node.lastCost;
    pushMetric(metrics, 'cost', 'Cost', cost == null ? null : `$${cost.toFixed(2)}`);
    const semanticMetric = buildDvtGraphNodeSemanticMetric(node);
    if (semanticMetric != null) metrics.push(semanticMetric);
  }
  return metrics;
}

function buildTitleDetail(node: CanonicalNode): string | null {
  const metadata = metadataOf(node);
  if (!containsDbtCompatibilityMetadata(metadata)) return null;
  const tags = node.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(' ');
  return [node.description?.trim(), tags].filter(Boolean).join(' · ') || null;
}

function buildSharedSourceModelCard(
  node: CanonicalNode,
  data: Record<string, unknown>
): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const isSource = node.kind.endsWith(':source');
  const presentationCopy = isCanvasNodePresentationCopy(data.presentationCopy)
    ? data.presentationCopy
    : null;
  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
  const title =
    node.pluginId === 'dvt.warehouse-source' && node.name !== node.id
      ? node.name
      : titlePresentation.title;
  const volume = buildGraphNodeVolumeMetricProjection({
    isSourceObject: isSource,
    metadata,
    data,
    locale: presentationCopy?.locale,
  });
  const runtimeData = {
    ...data,
    durationMs:
      numericValue(data.durationMs) ??
      numericValue(metadata.durationMs) ??
      (node.lastDuration == null ? undefined : node.lastDuration * 1000),
  };
  const summary = buildGraphNodeOperationalSummary({
    projectionKind: isSource ? 'source' : 'execution',
    title,
    metadata,
    data,
    runtimeData,
    volumeMetricProjection: volume,
    columnCount: resolveColumnCount(metadata, data),
    locale: presentationCopy?.locale,
  });
  const copy = resolveGraphNodeCardCopy(presentationCopy?.locale);
  const authorityLabel = containsDbtCompatibilityMetadata(metadata)
    ? (stringValue(metadata.package) ?? stringValue(metadata.packageName))
    : null;
  const projectedRows = volume.metrics.find((metric) => metric.id === 'rows');
  const projectedSize = volume.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const currentRows = summary.metrics.find((metric) => metric.id === 'rows');
  const currentSize = summary.metrics.find((metric) => metric.id === 'size');
  const operationalMetrics = [
    ...summary.metrics.filter((metric) => metric.id !== 'rows' && metric.id !== 'size'),
    projectedRows == null
      ? (currentRows ?? {
          id: 'rows',
          label: copy.rowsLabel,
          value: copy.notCalculatedLabel,
          icon: 'rows' as const,
        })
      : { ...projectedRows, id: 'rows', icon: 'rows' as const },
    projectedSize == null
      ? (currentSize ?? {
          id: 'size',
          label: copy.sizeLabel,
          value: copy.notCalculatedLabel,
          icon: 'database' as const,
        })
      : { ...projectedSize, id: 'size', icon: 'database' as const },
  ];

  return {
    title,
    titleDetail: buildTitleDetail(node),
    technicalName: titlePresentation.technicalName,
    subtitle: authorityLabel ?? resolveGraphNodeRelationPath(metadata, data) ?? node.path ?? null,
    path: node.path ?? resolveGraphNodeRelationPath(metadata, data) ?? null,
    kindLabel: isSource ? (stringValue(data.typeLabel) ?? 'Source') : null,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(
      node,
      metadata,
      data,
      isSource
        ? { label: presentationCopy?.readyStatusLabel ?? copy.readyStatusLabel, tone: 'healthy' }
        : { label: presentationCopy?.draftStatusLabel ?? copy.draftStatusLabel, tone: 'neutral' }
    ),
    metrics: buildAuthorityMetrics(node, metadata, runtimeData),
    operationalMetrics,
    operationalDetail: summary.detail,
    sourceIdentity: buildGraphNodeSourceIdentity(node, metadata, title, presentationCopy?.locale),
  };
}

export const sharedSourceModelGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'shared-source-model-card',
  matches: (node) => isSharedSourceModelKind(node.kind),
  build: buildSharedSourceModelCard,
};
