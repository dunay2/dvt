/** Owned concern: project dbt canonical nodes into professional graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import {
  arrayCount,
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
  const config = metadata.config;
  const configRecord =
    typeof config === 'object' && config !== null && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  const database =
    stringValue(metadata.database) ??
    stringValue(configRecord.database) ??
    stringValue(dbtRecord.databaseName);
  const schema =
    stringValue(metadata.schema) ??
    stringValue(configRecord.schema) ??
    stringValue(dbtRecord.schemaName);
  const table =
    stringValue(metadata.table) ??
    stringValue(metadata.tableName) ??
    stringValue(configRecord.table) ??
    stringValue(dbtRecord.tableName);
  const relation = [database, schema, table].filter(Boolean).join('.');
  const relationSubtitle = relation.length > 0 ? relation : null;
  const metrics: GraphNodeCardMetric[] = [];
  const operationalMetrics: GraphNodeCardMetric[] = [];
  const materialization = resolveDbtMaterialization(metadata);
  const rowCount = numericValue(metadata.rowCount) ?? numericValue(metadata.rows);
  const byteSize =
    numericValue(metadata.byteSize) ?? numericValue(metadata.bytes) ?? numericValue(data.byteSize);
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

  pushMetric(metrics, 'rows', 'Rows', rowCount == null ? null : formatCompactNumber(rowCount));
  pushMetric(metrics, 'bytes', 'Size', byteSize == null ? null : formatBytes(byteSize));
  pushMetric(metrics, 'materialization', 'Mat.', materialization);
  pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  pushMetric(metrics, 'test-target', 'Target', testTarget);
  pushMetric(metrics, 'severity', 'Severity', severity);
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));
  pushRuntimeMetrics(metrics, metadata, data);

  const lastRunAt = stringValue(metadata.lastRunAt) ?? stringValue(data.lastRunAt);
  const durationLabel = resolveRuntimeDurationLabel(metadata, data);
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

  const isSource = node.kind === 'dbt:source';

  return {
    title: node.name,
    subtitle: stringValue(metadata.package) ?? relationSubtitle ?? node.path ?? null,
    path: node.path ?? relationSubtitle ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    status: resolveNodeCardStatus(
      node,
      metadata,
      data,
      isSource ? { label: 'Ready', tone: 'success' } : { label: 'Draft', tone: 'warning' }
    ),
    metrics,
    operationalMetrics,
  };
}

export const dbtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dbt-card',
  matches: (node) => node.pluginId === 'dbt' || node.kind.startsWith('dbt:'),
  build: buildDbtCard,
};
