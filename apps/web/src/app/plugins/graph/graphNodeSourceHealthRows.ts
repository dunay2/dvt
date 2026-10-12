/** Owned concern: graphNodeSourceHealthRows. */
import { formatCompactNumber } from '../../components/canvas/formatCompactNumber';

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import type { GraphNodeVolumeMetricProjection } from './graphNodeSourceMetricProjection';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { formatBytes, pushOperationalMetric, stringValue } from './graphNodeCardStrategyUtils';
import {
  firstNumericValue,
  resolveSchemaDriftProjection,
  formatMinutes,
  formatCadenceMinutes,
  formatThroughputBytesPerMinute,
  sizeEvidenceTone,
} from './graphNodeOperationalValues';
import { pushByteLevelDetailRows } from './graphNodeSizeDetailRows';

export function buildSourceHealthRows(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  volumeMetricProjection: GraphNodeVolumeMetricProjection,
  columnCount: number | null,
  locale?: string
): {
  railMetrics: GraphNodeCardMetric[];
  detailRows: GraphNodeCardMetric[];
} {
  const freshnessMinutes = firstNumericValue(metadata, data, [
    'freshnessMinutes',
    'freshnessAgeMinutes',
  ]);
  const lastRefreshAt =
    stringValue(metadata.lastRefreshAt) ??
    stringValue(data.lastRefreshAt) ??
    stringValue(metadata.lastRefresh) ??
    stringValue(data.lastRefresh);
  const cadenceMinutes = firstNumericValue(metadata, data, ['cadenceMinutes', 'scheduleMinutes']);
  const throughputBytesPerMinute = firstNumericValue(metadata, data, [
    'throughputBytesPerMinute',
    'bytesPerMinute',
  ]);
  const { rowCount, sizeEvidence } = volumeMetricProjection;
  const rowMetric = volumeMetricProjection.metrics.find((metric) => metric.id === 'rows');
  const sizeMetric = volumeMetricProjection.metrics.find(
    (metric) => metric.id === 'bytes' || metric.id === 'estimated-bytes'
  );
  const copy = resolveGraphNodeCardCopy(locale);
  const schemaDrift = resolveSchemaDriftProjection(metadata, data, copy);
  const railMetrics: GraphNodeCardMetric[] = [];
  const detailRows: GraphNodeCardMetric[] = [];

  pushOperationalMetric(
    railMetrics,
    'freshness',
    copy.freshnessLabel,
    freshnessMinutes == null ? null : formatMinutes(freshnessMinutes),
    { icon: 'clock' }
  );
  pushOperationalMetric(railMetrics, 'last-refresh', copy.lastRefreshLabel, lastRefreshAt, {
    icon: 'refresh',
  });
  pushOperationalMetric(
    railMetrics,
    'cadence',
    copy.cadenceLabel,
    cadenceMinutes == null ? null : formatCadenceMinutes(cadenceMinutes, copy),
    { icon: 'refresh' }
  );
  pushOperationalMetric(
    railMetrics,
    'throughput',
    copy.throughputLabel,
    throughputBytesPerMinute == null
      ? null
      : formatThroughputBytesPerMinute(throughputBytesPerMinute, locale),
    { icon: 'throughput' }
  );
  pushOperationalMetric(
    railMetrics,
    'rows',
    copy.rowsLabel,
    rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
    {
      icon: 'rows',
      ...(rowMetric?.detail == null ? {} : { detail: rowMetric.detail }),
      ...(rowMetric?.tone == null ? {} : { tone: rowMetric.tone }),
    }
  );
  pushOperationalMetric(
    railMetrics,
    'size',
    sizeEvidence?.provenance === 'estimated' ? copy.estimatedSizeLabel : copy.sizeLabel,
    sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes, locale),
    sizeEvidence == null
      ? { icon: 'database' }
      : {
          icon: 'database',
          tone: sizeEvidenceTone(sizeEvidence),
          ...(sizeMetric?.detail == null ? {} : { detail: sizeMetric.detail }),
        }
  );

  const schemaDriftRailOnly = railMetrics.length === 0 && schemaDrift !== null;
  if (schemaDriftRailOnly) {
    pushOperationalMetric(railMetrics, 'schema-drift', copy.schemaDriftLabel, schemaDrift.label, {
      icon: 'drift',
      tone: schemaDrift.tone,
    });
  }

  detailRows.push(...railMetrics);
  if (sizeEvidence !== null && !railMetrics.some((metric) => metric.id === 'columns')) {
    pushOperationalMetric(
      detailRows,
      'columns',
      copy.columnsLabel,
      columnCount == null ? null : formatCompactNumber(columnCount),
      { icon: 'columns' }
    );
  }
  pushByteLevelDetailRows(detailRows, rowCount, sizeEvidence, sizeMetric?.detail, locale);
  if (!railMetrics.some((metric) => metric.id === 'rows')) {
    pushOperationalMetric(
      detailRows,
      'rows',
      copy.rowsLabel,
      rowCount == null || sizeEvidence == null ? null : formatCompactNumber(rowCount),
      {
        icon: 'rows',
        ...(rowMetric?.detail == null ? {} : { detail: rowMetric.detail }),
        ...(rowMetric?.tone == null ? {} : { tone: rowMetric.tone }),
      }
    );
  }
  if (!schemaDriftRailOnly) {
    pushOperationalMetric(
      detailRows,
      'schema-drift',
      copy.schemaDriftLabel,
      schemaDrift?.label ?? null,
      schemaDrift == null ? undefined : { icon: 'drift', tone: schemaDrift.tone }
    );
  }

  return { railMetrics, detailRows };
}
