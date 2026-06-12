/** Owned concern: project DVT transformation nodes into operational graph card summaries. */
import type { CanonicalNode } from '../../types/canonical';
import type {
  GraphNodeCardMetric,
  GraphNodeCardReadModel,
  GraphNodeCardStrategy,
} from '../graph/graphNodeCardStrategyContracts';
import {
  formatBytes,
  formatCompactNumber,
  metadataOf,
  numericValue,
  pushMetric,
  resolveColumnCount,
  stringValue,
} from '../graph/graphNodeCardStrategyUtils';

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

export const dvtGraphNodeCardStrategy: GraphNodeCardStrategy = {
  id: 'dvt-card',
  matches: (node) => node.pluginId === 'dvt' || node.kind.startsWith('dvt:'),
  build: buildDvtCard,
};
