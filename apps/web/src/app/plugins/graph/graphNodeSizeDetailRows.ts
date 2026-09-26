/** Owned concern: graphNodeSizeDetailRows. */

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import type { GraphNodeSizeEvidenceProjection } from './graphNodeSourceMetricProjection';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { formatBytes, pushOperationalMetric } from './graphNodeCardStrategyUtils';
import type { GraphNodeCardCopy } from './graphNodeOperationalValues';
import { sizeEvidenceTone } from './graphNodeOperationalValues';

function formatAverageBytes(value: number, locale?: string): string {
  if (Math.abs(value) < 1024) {
    return `${new Intl.NumberFormat(
      locale?.trim().toLowerCase().startsWith('es') ? 'es-ES' : 'en-US',
      { maximumFractionDigits: 1 }
    ).format(value)} B`;
  }
  return formatBytes(value, locale);
}

function detailedSizeLabel(
  sizeEvidence: GraphNodeSizeEvidenceProjection | null,
  copy: GraphNodeCardCopy
): string {
  if (sizeEvidence?.basis === 'physical-allocation') {
    return copy.allocatedSizeLabel;
  }
  if (sizeEvidence?.basis === 'lower-bound') {
    return copy.minimumSizeLabel;
  }
  return sizeEvidence?.provenance === 'estimated'
    ? copy.estimatedPayloadSizeLabel
    : copy.datasetSizeLabel;
}

export function pushByteLevelDetailRows(
  detailRows: GraphNodeCardMetric[],
  rowCount: number | null,
  sizeEvidence: GraphNodeSizeEvidenceProjection | null,
  detail?: string,
  locale?: string
): void {
  const copy = resolveGraphNodeCardCopy(locale);
  pushOperationalMetric(
    detailRows,
    'dataset-size',
    detailedSizeLabel(sizeEvidence, copy),
    sizeEvidence == null ? null : formatBytes(sizeEvidence.bytes, locale),
    sizeEvidence == null
      ? { icon: 'database' }
      : {
          icon: 'database',
          tone: sizeEvidenceTone(sizeEvidence),
          ...(detail == null ? {} : { detail }),
        }
  );
  pushOperationalMetric(
    detailRows,
    'observed-at',
    copy.observedLabel,
    sizeEvidence?.observedAt ?? null,
    {
      icon: 'clock',
    }
  );

  const averageRowSize =
    rowCount == null ||
    rowCount <= 0 ||
    sizeEvidence == null ||
    sizeEvidence.basis !== 'logical-payload'
      ? null
      : sizeEvidence.bytes / rowCount;
  pushOperationalMetric(
    detailRows,
    'avg-row-size',
    sizeEvidence?.provenance === 'estimated'
      ? copy.estimatedAverageRowSizeLabel
      : copy.averageRowSizeLabel,
    averageRowSize == null ? null : formatAverageBytes(averageRowSize, locale),
    sizeEvidence == null
      ? { icon: 'throughput' }
      : { icon: 'throughput', tone: sizeEvidenceTone(sizeEvidence) }
  );
}
