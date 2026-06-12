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

export const dbtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dbt-card',
  matches: (node) => node.pluginId === 'dbt' || node.kind.startsWith('dbt:'),
  build: buildDbtCard,
};
