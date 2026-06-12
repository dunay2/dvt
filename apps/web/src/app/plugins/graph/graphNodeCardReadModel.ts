/** Owned concern: project canonical graph nodes into strategy-owned card read models. */
import type { CanonicalNode } from '../../types/canonical';

export type GraphNodeCardMetric = Readonly<{
  id: string;
  label: string;
  value: string;
}>;

export type GraphNodeCardReadModel = Readonly<{
  title: string;
  subtitle: string | null;
  kindLabel: string;
  metrics: readonly GraphNodeCardMetric[];
}>;

type GraphNodeCardStrategy = Readonly<{
  id: string;
  matches: (node: CanonicalNode) => boolean;
  build: (node: CanonicalNode, data: Record<string, unknown>) => GraphNodeCardReadModel;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function metadataOf(node: CanonicalNode): Record<string, unknown> {
  return isRecord(node.metadata) ? node.metadata : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function arrayCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

function formatBytes(value: number): string {
  if (Math.abs(value) >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  if (Math.abs(value) >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }
  if (Math.abs(value) >= 1024) {
    return `${(value / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${value} B`;
}

function pushMetric(
  metrics: GraphNodeCardMetric[],
  id: string,
  label: string,
  value: string | number | null
): void {
  if (value === null) {
    return;
  }
  metrics.push({ id, label, value: String(value) });
}

function resolveColumnCount(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): number {
  return arrayCount(data.columns) ?? arrayCount(metadata.columns) ?? 0;
}

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

function buildDvtCard(node: CanonicalNode, data: Record<string, unknown>): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const metrics: GraphNodeCardMetric[] = [];
  const rowCount = numericValue(metadata.rowCount) ?? numericValue(data.rowCount);
  const byteSize =
    numericValue(metadata.byteSize) ?? numericValue(metadata.bytes) ?? numericValue(data.byteSize);

  pushMetric(metrics, 'rows', 'Rows', rowCount == null ? null : formatCompactNumber(rowCount));
  pushMetric(metrics, 'bytes', 'Size', byteSize == null ? null : formatBytes(byteSize));
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));

  return {
    title: node.name,
    subtitle: buildDvtSubtitle(metadata, node.path),
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    metrics,
  };
}

function resolveDbtMaterialization(metadata: Record<string, unknown>): string | null {
  const config = metadata.config;
  if (!isRecord(config)) {
    return null;
  }
  return stringValue(config.materialized) ?? stringValue(config.materialization);
}

function buildDbtCard(node: CanonicalNode, data: Record<string, unknown>): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const metrics: GraphNodeCardMetric[] = [];
  const materialization = resolveDbtMaterialization(metadata);

  pushMetric(metrics, 'materialization', 'Mat.', materialization);
  pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));

  return {
    title: node.name,
    subtitle: stringValue(metadata.package) ?? node.path ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    metrics,
  };
}

function buildDefaultCard(
  node: CanonicalNode,
  data: Record<string, unknown>
): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const metrics: GraphNodeCardMetric[] = [];

  pushMetric(
    metrics,
    'duration',
    'Duration',
    node.lastDuration == null ? null : `${node.lastDuration}s`
  );
  pushMetric(
    metrics,
    'cost',
    'Cost',
    node.lastCost == null ? null : `$${node.lastCost.toFixed(2)}`
  );
  pushMetric(metrics, 'columns', 'Columns', resolveColumnCount(metadata, data));

  return {
    title: node.name,
    subtitle: node.path ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    metrics,
  };
}

const strategies: readonly GraphNodeCardStrategy[] = [
  {
    id: 'dbt-card',
    matches: (node) => node.pluginId === 'dbt' || node.kind.startsWith('dbt:'),
    build: buildDbtCard,
  },
  {
    id: 'dvt-card',
    matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
    build: buildDvtCard,
  },
];

export function buildGraphNodeCardReadModel(
  node: CanonicalNode,
  data: Record<string, unknown>
): GraphNodeCardReadModel {
  return (
    strategies.find((strategy) => strategy.matches(node))?.build(node, data) ??
    buildDefaultCard(node, data)
  );
}
