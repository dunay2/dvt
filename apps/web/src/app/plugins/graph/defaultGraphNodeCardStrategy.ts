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
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  stringValue,
} from './graphNodeCardStrategyUtils';
import { buildGraphNodeTitlePresentation } from './graphNodeTitlePresentation';

function buildDefaultCard(
  node: CanonicalNode,
  data: Record<string, unknown>
): GraphNodeCardReadModel {
  const metadata = metadataOf(node);
  const metrics: GraphNodeCardMetric[] = [];
  const titlePresentation = buildGraphNodeTitlePresentation({
    nodeName: node.name,
    pluginId: node.pluginId,
    kind: node.kind,
    metadata,
    data,
  });
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
  return {
    title: titlePresentation.title,
    titleDetail: null,
    technicalName: titlePresentation.technicalName,
    subtitle: node.path ?? null,
    path: node.path ?? null,
    kindLabel: stringValue(data.typeLabel) ?? node.kind,
    accentTone: resolveNodeCardAccentTone(node),
    health: resolveNodeCardHealth(node, metadata, data),
    metrics,
    operationalMetrics: [],
    operationalDetail: buildGraphNodeOperationalDetail(titlePresentation.title, []),
    sourceIdentity: null,
  };
}

export const defaultGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'default-card',
  matches: () => true,
  build: buildDefaultCard,
};
