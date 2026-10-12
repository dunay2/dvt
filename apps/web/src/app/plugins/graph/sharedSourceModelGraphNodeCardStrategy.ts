/** Owned concern: sharedSourceModelGraphNodeCardStrategy. */

import type { CanonicalNode, PluginNodeKind } from '../../types/canonical';
import { hasDbtCompatibilityMetadata } from '../../views/canvas/canvasDbtAuthoringModel';
import { isCanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import { isCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { buildGraphNodeOperationalSummary } from './graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';
import { buildGraphNodeTitlePresentation } from './graphNodeTitlePresentation';
import type {
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import {
  buildGraphNodeSourceIdentity,
  metadataOf,
  numericValue,
  resolveColumnCount,
  resolveGraphNodeRelationPath,
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  stringValue,
} from './graphNodeCardStrategyUtils';
import { buildAuthorityMetrics, buildTitleDetail } from './graphNodeAuthorityMetrics';

const SHARED_SOURCE_MODEL_KINDS = new Set<PluginNodeKind>(['dvt:source', 'dvt:transform']);

export function isSharedSourceModelKind(kind: PluginNodeKind): boolean {
  return SHARED_SOURCE_MODEL_KINDS.has(kind);
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
  const relationalComposition = isCanvasNodePresentationTruth(data.presentationTruth)
    ? data.presentationTruth.relationalComposition
    : undefined;
  const authorityMetrics = buildAuthorityMetrics(
    node,
    metadata,
    runtimeData,
    isSource,
    copy
  ).filter((metric) => metric.id !== 'last-run');
  const authorityLabel = hasDbtCompatibilityMetadata(node)
    ? (stringValue(metadata.package) ?? stringValue(metadata.packageName))
    : null;
  const projectedRows = volume.metrics.find((metric) => metric.id === 'rows');
  const projectedSize = volume.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const currentRows = summary.metrics.find((metric) => metric.id === 'rows');
  const currentSize = summary.metrics.find((metric) => metric.id === 'size');
  const operationalMetrics = [
    ...summary.metrics.filter(
      (metric) =>
        metric.id !== 'rows' && metric.id !== 'size' && (isSource || metric.id !== 'last-run')
    ),
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
    kindLabel:
      relationalComposition?.state === 'incomplete' || relationalComposition?.state === 'unresolved'
        ? copy.relationalCompositionIncompleteLabel
        : null,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(
      node,
      metadata,
      data,
      isSource
        ? { label: presentationCopy?.readyStatusLabel ?? copy.readyStatusLabel, tone: 'healthy' }
        : { label: presentationCopy?.draftStatusLabel ?? copy.draftStatusLabel, tone: 'neutral' }
    ),
    metrics: authorityMetrics,
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
