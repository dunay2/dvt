/** Owned concern: project dbt canonical nodes into professional graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import { resolveGraphNodeCardCopy } from '../graph/graphNodeCardCopyTokens';
import { buildGraphNodeOperationalSummary } from '../graph/graphNodeOperationalSummary';
import { buildGraphNodeVolumeMetricProjection } from '../graph/graphNodeSourceMetricProjection';
import { buildGraphNodeTitlePresentation } from '../graph/graphNodeTitlePresentation';
import {
  arrayCount,
  buildGraphNodeSourceIdentity,
  metadataOf,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  resolveColumnCount,
  resolveGraphNodeRelationPath,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';
import { isCanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import { isSharedSourceModelKind } from '../graph/sharedSourceModelGraphNodeCardStrategy';

function resolveDbtMaterialization(metadata: Record<string, unknown>): string | null {
  const config = metadata.config;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return null;
  }

  const configRecord = config as Record<string, unknown>;
  return stringValue(configRecord.materialized) ?? stringValue(configRecord.materialization);
}

function resolveDbtMaterializationIcon(
  materialization: string | null
): GraphNodeCardMetricIcon | null {
  switch (materialization?.toLowerCase()) {
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
      return null;
  }
}

function buildDbtTitleDetail(node: CanonicalNode): string | null {
  const description = stringValue(node.description);
  const tags = node.tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => `#${tag}`)
    .join(' ');
  const detail = [description, tags.length > 0 ? tags : null].filter(Boolean).join(' · ');
  return detail.length > 0 ? detail : null;
}

function buildDbtCard(node: CanonicalNode, data: Record<string, unknown>): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const dbt = metadata.dbt;
  const dbtRecord =
    typeof dbt === 'object' && dbt !== null && !Array.isArray(dbt)
      ? (dbt as Record<string, unknown>)
      : {};
  const relationPath = resolveGraphNodeRelationPath(metadata, data);
  const metrics: GraphNodeCardMetric[] = [];
  const materialization = resolveDbtMaterialization(metadata);
  const materializationIcon = resolveDbtMaterializationIcon(materialization);
  const columnCount = resolveColumnCount(metadata, data);
  const targetModel =
    stringValue(metadata.testTargetModel) ??
    stringValue(metadata.targetModel) ??
    stringValue(data.testTargetModel) ??
    stringValue(data.targetModel);
  const targetColumn =
    stringValue(metadata.testTargetColumn) ??
    stringValue(metadata.targetColumn) ??
    stringValue(data.testTargetColumn) ??
    stringValue(data.targetColumn);
  const composedTestTarget = [targetModel, targetColumn].filter(Boolean).join('.');
  const testTarget =
    stringValue(metadata.testTarget) ??
    stringValue(data.testTarget) ??
    (composedTestTarget.length > 0 ? composedTestTarget : null);
  const severity = stringValue(metadata.severity) ?? stringValue(data.severity);
  const isSourceObject = node.role === 'input';
  const presentationCopy = isCanvasNodePresentationCopy(data.presentationCopy)
    ? data.presentationCopy
    : null;
  const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
    isSourceObject,
    metadata,
    data,
    locale: presentationCopy?.locale,
  });

  pushMetric(
    metrics,
    'materialization',
    'Mat.',
    materialization,
    materializationIcon == null
      ? { placement: 'header' }
      : { icon: materializationIcon, placement: 'header' }
  );
  pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  pushMetric(metrics, 'test-target', 'Target', testTarget);
  pushMetric(metrics, 'severity', 'Severity', severity);
  pushRuntimeMetrics(metrics, metadata, data);

  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
  const operationalSummary = buildGraphNodeOperationalSummary({
    projectionKind: isSourceObject ? 'source' : 'execution',
    title: titlePresentation.title,
    metadata,
    data,
    volumeMetricProjection,
    columnCount,
    locale: presentationCopy?.locale,
  });
  const operationalCopy = resolveGraphNodeCardCopy(presentationCopy?.locale);

  return {
    title: titlePresentation.title,
    titleDetail: buildDbtTitleDetail(node),
    technicalName: titlePresentation.technicalName,
    subtitle: stringValue(metadata.package) ?? relationPath ?? node.path ?? null,
    path: node.path ?? relationPath ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(
      node,
      metadata,
      data,
      isSourceObject
        ? {
            label: presentationCopy?.readyStatusLabel ?? operationalCopy.readyStatusLabel,
            tone: 'healthy',
          }
        : {
            label: presentationCopy?.draftStatusLabel ?? operationalCopy.draftStatusLabel,
            tone: 'neutral',
          }
    ),
    metrics,
    operationalMetrics: operationalSummary.metrics,
    operationalDetail: operationalSummary.detail,
    sourceIdentity: buildGraphNodeSourceIdentity(
      node,
      metadata,
      titlePresentation.title,
      presentationCopy?.locale
    ),
  };
}

export const dbtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dbt-card',
  matches: (node) =>
    (node.pluginId === 'dbt' || node.kind.startsWith('dbt:')) &&
    !isSharedSourceModelKind(node.kind),
  build: buildDbtCard,
};
