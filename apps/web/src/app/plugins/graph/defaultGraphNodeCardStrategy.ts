/** Owned concern: project generic canonical nodes when no plugin card strategy matches. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from './graphNodeCardStrategyContracts';
import { graphNodeCardCopyTokens } from './graphNodeCardCopyTokens';
import {
  buildGraphNodeOperationalDetail,
  metadataOf,
  pushMetric,
  resolveNodeCardAccentTone,
  resolveNodeCardHealth,
  resolveColumnCount,
  resolveColumnMetricPresentation,
  resolveCodeMetricPresentation,
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
  const columnPresentation = resolveColumnMetricPresentation(metadata, data);
  const codePresentation = resolveCodeMetricPresentation(data);

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
  pushMetric(metrics, 'code', codePresentation?.label ?? 'Code', codePresentation?.value ?? null, {
    ...(codePresentation?.detail == null ? {} : { detail: codePresentation.detail }),
  });
  pushMetric(metrics, 'columns', columnPresentation.label, resolveColumnCount(metadata, data), {
    ...(columnPresentation.detail == null ? {} : { detail: columnPresentation.detail }),
  });

  return {
    title: titlePresentation.title,
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
    nodeActionsLabel: graphNodeCardCopyTokens.nodeActionsLabel,
  };
}

export const defaultGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'default-card',
  matches: () => true,
  build: buildDefaultCard,
};
