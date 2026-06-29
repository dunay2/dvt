/** Owned concern: project generic canonical nodes when no plugin card strategy matches. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import {
  buildGraphNodeOperationalDetail,
  metadataOf,
  pushMetric,
  resolveNodeCardStatus,
  resolveColumnCount,
  stringValue,
} from './graphNodeCardStrategyUtils';

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
    path: node.path ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    status: resolveNodeCardStatus(node, metadata, data),
    metrics,
    operationalMetrics: [],
    operationalDetail: buildGraphNodeOperationalDetail(node.name, []),
  };
}

export const defaultGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'default-card',
  matches: () => true,
  build: buildDefaultCard,
};
