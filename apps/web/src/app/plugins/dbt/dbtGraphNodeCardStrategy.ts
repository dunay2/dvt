/** Owned concern: project dbt canonical nodes into professional graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import {
  arrayCount,
  metadataOf,
  pushMetric,
  pushRuntimeMetrics,
  resolveColumnCount,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';

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
  const metrics: GraphNodeCardMetric[] = [];
  const materialization = resolveDbtMaterialization(metadata);
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

  pushMetric(metrics, 'materialization', 'Mat.', materialization);
  pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  pushMetric(metrics, 'test-target', 'Target', testTarget);
  pushMetric(metrics, 'severity', 'Severity', severity);
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));
  pushRuntimeMetrics(metrics, metadata, data);

  return {
    title: node.name,
    subtitle: stringValue(metadata.package) ?? node.path ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    metrics,
  };
}

export const dbtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dbt-card',
  matches: (node) => node.pluginId === 'dbt' || node.kind.startsWith('dbt:'),
  build: buildDbtCard,
};
