/** Owned concern: graphNodeAuthorityMetrics. */

import type { CanonicalNode } from '../../types/canonical';
import { hasDbtCompatibilityMetadata } from '../../views/canvas/canvasDbtAuthoringModel';
import { isCanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import { buildDvtGraphNodeSemanticMetric } from '../dvt/dvtGraphNodeSemanticMetric';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
} from './graphNodeCardStrategyContracts';
import {
  arrayCount,
  numericValue,
  pushMetric,
  pushRuntimeMetrics,
  stringValue,
} from './graphNodeCardStrategyUtils';

function resolveMaterialization(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): string | null {
  const dbt = metadata.dbt;
  const dbtRecord =
    typeof dbt === 'object' && dbt !== null && !Array.isArray(dbt)
      ? (dbt as Record<string, unknown>)
      : {};
  const config = metadata.config ?? dbtRecord.config;
  const record =
    typeof config === 'object' && config !== null && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  const configured = stringValue(record.materialized) ?? stringValue(record.materialization);
  if (configured != null) return configured;

  return node.pluginId === 'dvt' && node.kind === 'dvt:transform' ? 'view' : null;
}

function resolveMaterializationIcon(value: string | null): GraphNodeCardMetricIcon | undefined {
  switch (value?.toLowerCase()) {
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
      return undefined;
  }
}

export function buildAuthorityMetrics(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  isSource: boolean,
  copy: ReturnType<typeof resolveGraphNodeCardCopy>
): GraphNodeCardMetric[] {
  const metrics: GraphNodeCardMetric[] = [];
  if (!isSource) {
    const materialization = resolveMaterialization(node, metadata);
    pushMetric(metrics, 'materialization', 'Mat.', materialization ?? copy.notConfiguredLabel, {
      placement: 'header',
      ...(resolveMaterializationIcon(materialization) == null
        ? {}
        : { icon: resolveMaterializationIcon(materialization) }),
    });
  }
  if (hasDbtCompatibilityMetadata(node)) {
    pushMetric(metrics, 'dependencies', 'Deps', arrayCount(metadata.dependencies));
  } else {
    pushRuntimeMetrics(metrics, metadata, data);
    const cost =
      numericValue(metadata.cost) ??
      numericValue(metadata.lastCost) ??
      numericValue(data.lastCost) ??
      node.lastCost;
    pushMetric(metrics, 'cost', 'Cost', cost == null ? null : `$${cost.toFixed(2)}`);
    const semanticMetric = buildDvtGraphNodeSemanticMetric(
      node,
      data.presentationTruth,
      isCanvasNodePresentationCopy(data.presentationCopy) ? data.presentationCopy.locale : undefined
    );
    if (semanticMetric != null) metrics.push(semanticMetric);
  }
  return metrics;
}

export function buildTitleDetail(node: CanonicalNode): string | null {
  if (!hasDbtCompatibilityMetadata(node)) return null;
  const tags = node.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(' ');
  return [node.description?.trim(), tags].filter(Boolean).join(' · ') || null;
}
