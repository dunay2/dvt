/** Owned concern: graphNodeOperationalSummary. */
import { formatCompactNumber } from '../../components/canvas/formatCompactNumber';

import type {
  GraphNodeCardMetric,
  GraphNodeOperationalDetail,
} from './graphNodeCardStrategyContracts';
import type { GraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import {
  buildGraphNodeOperationalDetail,
  formatBytes,
  pushOperationalMetric,
} from './graphNodeCardStrategyUtils';
import { buildSourceHealthRows } from './graphNodeSourceHealthRows';
import { buildModelExecutionMetrics } from './graphNodeExecutionMetrics';
import { sizeEvidenceTone } from './graphNodeOperationalValues';
import { pushByteLevelDetailRows } from './graphNodeSizeDetailRows';

export type GraphNodeOperationalSummary = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
  detail: GraphNodeOperationalDetail | null;
}>;

export type GraphNodeOperationalSummaryInput = Readonly<{
  projectionKind: 'source' | 'execution';
  title: string;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  runtimeData?: Record<string, unknown>;
  volumeMetricProjection: GraphNodeVolumeMetricProjection;
  columnCount: number | null;
  locale?: string;
}>;

function buildAdditionalOperationalDetail(
  title: string,
  railMetrics: readonly GraphNodeCardMetric[],
  detailRows: readonly GraphNodeCardMetric[],
  locale?: string
): GraphNodeOperationalDetail | null {
  const railMetricIds = new Set(railMetrics.map((metric) => metric.id));
  const additionalRows = detailRows.filter((row) => !railMetricIds.has(row.id));
  return additionalRows.length > 0
    ? buildGraphNodeOperationalDetail(title, additionalRows, locale)
    : null;
}

export function buildGraphNodeOperationalSummary({
  projectionKind,
  title,
  metadata,
  data,
  runtimeData = data,
  volumeMetricProjection,
  columnCount,
  locale,
}: GraphNodeOperationalSummaryInput): GraphNodeOperationalSummary {
  if (projectionKind === 'source') {
    const sourceHealth = buildSourceHealthRows(
      metadata,
      data,
      volumeMetricProjection,
      columnCount,
      locale
    );
    return {
      metrics: sourceHealth.railMetrics,
      detail: buildAdditionalOperationalDetail(
        title,
        sourceHealth.railMetrics,
        sourceHealth.detailRows,
        locale
      ),
    };
  }
  const copy = resolveGraphNodeCardCopy(locale);
  const metrics: GraphNodeCardMetric[] = [];
  const { rowCount, sizeEvidence } = volumeMetricProjection;
  const volumeRowMetric = volumeMetricProjection.metrics.find((metric) => metric.id === 'rows');
  const volumeSizeMetric = volumeMetricProjection.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const modelExecutionMetrics = buildModelExecutionMetrics(
    metadata,
    data,
    runtimeData,
    rowCount,
    locale
  );

  const hasModelExecutionMetrics = modelExecutionMetrics.length > 0;
  if (hasModelExecutionMetrics) {
    metrics.push(...modelExecutionMetrics);
  } else {
    pushOperationalMetric(
      metrics,
      'rows',
      copy.rowsLabel,
      rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
      {
        icon: 'rows',
        ...(volumeRowMetric?.detail == null ? {} : { detail: volumeRowMetric.detail }),
        ...(volumeRowMetric?.tone == null ? {} : { tone: volumeRowMetric.tone }),
      }
    );
    pushOperationalMetric(
      metrics,
      'size',
      sizeEvidence?.provenance === 'estimated' ? copy.estimatedSizeLabel : copy.sizeLabel,
      sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes, locale),
      sizeEvidence == null
        ? { icon: 'database' }
        : {
            icon: 'database',
            tone: sizeEvidenceTone(sizeEvidence),
            ...(volumeSizeMetric?.detail == null ? {} : { detail: volumeSizeMetric.detail }),
          }
    );
  }

  const staticDetailRows: GraphNodeCardMetric[] = [];
  if (!hasModelExecutionMetrics && sizeEvidence !== null) {
    pushOperationalMetric(
      staticDetailRows,
      'columns',
      copy.columnsLabel,
      columnCount == null ? null : formatCompactNumber(columnCount),
      { icon: 'columns' }
    );
    pushByteLevelDetailRows(
      staticDetailRows,
      rowCount,
      sizeEvidence,
      volumeSizeMetric?.detail,
      locale
    );
  }

  return {
    metrics,
    detail: buildGraphNodeOperationalDetail(title, staticDetailRows, locale),
  };
}
