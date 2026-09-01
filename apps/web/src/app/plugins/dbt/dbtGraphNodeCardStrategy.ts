/** Owned concern: project dbt canonical nodes into professional graph card summaries. */
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
  arrayCount,
  buildGraphNodeSourceIdentity,
  metadataOf,
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

function resolveDbtMaterialization(metadata: Record<string, unknown>): string | null {
  const config = metadata.config;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return null;
  }

  const configRecord = config as Record<string, unknown>;
  return stringValue(configRecord.materialized) ?? stringValue(configRecord.materialization);
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
  const columnPresentation = resolveColumnMetricPresentation(metadata, data);
  const codePresentation = resolveCodeMetricPresentation(data);
  const columnCount = columnPresentation.count;
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
  const isSource = node.kind === 'dbt:source';
  const presentationCopy = isCanvasNodePresentationCopy(data.presentationCopy)
    ? data.presentationCopy
    : null;
  const volumeMetricProjection = buildGraphNodeVolumeMetricProjection({
    isSourceObject: isSource || node.role === 'input',
    metadata,
    data,
    locale: presentationCopy?.locale,
  });

  pushMetric(metrics, 'materialization', 'Mat.', materialization);
  pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  pushMetric(metrics, 'test-target', 'Target', testTarget);
  pushMetric(metrics, 'severity', 'Severity', severity);
  pushMetric(metrics, 'code', codePresentation?.label ?? 'Code', codePresentation?.value ?? null, {
    ...(codePresentation?.detail == null ? {} : { detail: codePresentation.detail }),
  });
  pushMetric(metrics, 'columns', columnPresentation.label, resolveColumnCount(metadata, data), {
    ...(columnPresentation.detail == null ? {} : { detail: columnPresentation.detail }),
  });
  pushRuntimeMetrics(metrics, metadata, data);

  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
  const operationalSummary = buildGraphNodeOperationalSummary({
    projectionKind: isSource || node.role === 'input' ? 'source' : 'execution',
    title: titlePresentation.title,
    metadata,
    data,
    volumeMetricProjection,
    columnCount,
    locale: presentationCopy?.locale,
  });

  return {
    title: titlePresentation.title,
    technicalName: titlePresentation.technicalName,
    subtitle: stringValue(metadata.package) ?? relationPath ?? node.path ?? null,
    path: node.path ?? relationPath ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(
      node,
      metadata,
      data,
      isSource
        ? { label: presentationCopy?.readyStatusLabel ?? 'Ready', tone: 'healthy' }
        : { label: presentationCopy?.draftStatusLabel ?? 'Draft', tone: 'neutral' }
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
    nodeActionsLabel:
      presentationCopy?.nodeActionsLabel ?? graphNodeCardCopyTokens.nodeActionsLabel,
  };
}

export const dbtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dbt-card',
  matches: (node) => node.pluginId === 'dbt' || node.kind.startsWith('dbt:'),
  build: buildDbtCard,
};
