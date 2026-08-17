/** Owned concern: project source-object and runtime volume evidence into graph-card metrics. */
import type {
  SourceObjectByteSizeBasis,
  SourceObjectMetricConfidence,
  SourceObjectMetricMethod,
  SourceObjectMetricObservationScope,
  SourceObjectMetricProvenance,
} from '@dvt/contracts';
import { readSourceObjectMetricEvidence } from '../../services/workspace/sourceObjectMetricEvidence';
import {
  describeSourceObjectMetricEvidence,
  formatSourceObjectMetricByteDetail,
} from '../../services/workspace/sourceObjectMetricEvidencePresentation';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import { formatBytes, formatCompactNumber, numericValue } from './graphNodeCardStrategyUtils';

export type GraphNodeSizeEvidenceProjection = Readonly<{
  bytes: number;
  provenance: SourceObjectMetricProvenance;
  method?: SourceObjectMetricMethod;
  confidence?: SourceObjectMetricConfidence;
  basis?: SourceObjectByteSizeBasis;
  observedAt?: string;
  observationScope?: SourceObjectMetricObservationScope;
}>;

export type GraphNodeVolumeMetricProjection = Readonly<{
  rowCount: number | null;
  sizeEvidence: GraphNodeSizeEvidenceProjection | null;
  metrics: readonly GraphNodeCardMetric[];
}>;

type GraphNodeVolumeMetricProjectionInput = Readonly<{
  isSourceObject: boolean;
  metadata: Record<string, unknown>;
  data: Record<string, unknown>;
  locale?: string;
}>;

function buildSourceProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  locale?: string
): GraphNodeVolumeMetricProjection {
  const evidence = readSourceObjectMetricEvidence(metadata.sourceMetricEvidence);
  if (evidence === null) {
    return { rowCount: null, sizeEvidence: null, metrics: [] };
  }
  const { rowCount: rowEvidence, byteSize: byteEvidence } = evidence;
  const copy = resolveGraphNodeCardCopy(locale);
  const numberFormatter = new Intl.NumberFormat(
    locale?.trim().toLowerCase().startsWith('es') ? 'es-ES' : 'en-US'
  );
  const formattedRowCount = numberFormatter.format(rowEvidence.value);
  const formattedByteSize = formatSourceObjectMetricByteDetail(byteEvidence.value, numberFormatter);

  const rowTone = rowEvidence.provenance === 'measured' ? 'success' : 'warning';
  const sizeTone = byteEvidence.provenance === 'measured' ? 'success' : 'warning';
  return {
    rowCount: rowEvidence.value,
    sizeEvidence: {
      bytes: byteEvidence.value,
      provenance: byteEvidence.provenance,
      method: byteEvidence.method,
      confidence: byteEvidence.confidence,
      basis: byteEvidence.basis,
      observedAt: evidence.observedAt,
      observationScope: evidence.observationScope,
    },
    metrics: [
      {
        id: 'rows',
        label: copy.rowsLabel,
        value: formatCompactNumber(rowEvidence.value),
        tone: rowTone,
        detail: describeSourceObjectMetricEvidence({
          metric: rowEvidence,
          subject: `${formattedRowCount} ${copy.rowsLabel.toLocaleLowerCase(locale)}`,
          evidence,
          locale,
        }),
      },
      {
        id: byteEvidence.provenance === 'measured' ? 'bytes' : 'estimated-bytes',
        label: byteEvidence.provenance === 'measured' ? copy.sizeLabel : copy.estimatedSizeLabel,
        value: formatBytes(byteEvidence.value, locale),
        tone: sizeTone,
        detail: describeSourceObjectMetricEvidence({
          metric: byteEvidence,
          subject: formattedByteSize,
          evidence,
          basis: byteEvidence.basis,
          locale,
        }),
      },
    ],
  };
}

function buildRuntimeProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  locale?: string
): GraphNodeVolumeMetricProjection {
  const copy = resolveGraphNodeCardCopy(locale);
  const numberFormatter = new Intl.NumberFormat(
    locale?.trim().toLowerCase().startsWith('es') ? 'es-ES' : 'en-US'
  );
  const rowCount =
    numericValue(metadata.rowCount) ??
    numericValue(metadata.rows) ??
    numericValue(data.rowCount) ??
    numericValue(data.rows);
  const measuredByteSize =
    numericValue(metadata.datasetSizeBytes) ??
    numericValue(data.datasetSizeBytes) ??
    numericValue(metadata.sourceSizeBytes) ??
    numericValue(data.sourceSizeBytes) ??
    numericValue(metadata.byteSize) ??
    numericValue(metadata.bytes) ??
    numericValue(data.byteSize) ??
    numericValue(data.bytes);
  const estimatedByteSize =
    numericValue(metadata.estimatedByteSize) ?? numericValue(data.estimatedByteSize);
  const sizeEvidence: GraphNodeSizeEvidenceProjection | null =
    measuredByteSize !== null
      ? { bytes: measuredByteSize, provenance: 'measured', basis: 'logical-payload' }
      : estimatedByteSize !== null
        ? { bytes: estimatedByteSize, provenance: 'estimated', basis: 'logical-payload' }
        : null;
  const metrics: GraphNodeCardMetric[] = [];

  if (rowCount !== null) {
    metrics.push({
      id: 'rows',
      label: copy.rowsLabel,
      value: formatCompactNumber(rowCount),
      detail: `${numberFormatter.format(rowCount)} ${copy.rowsLabel.toLocaleLowerCase(locale)}.`,
    });
  }
  if (sizeEvidence !== null) {
    metrics.push({
      id: sizeEvidence.provenance === 'measured' ? 'bytes' : 'estimated-bytes',
      label: sizeEvidence.provenance === 'measured' ? copy.sizeLabel : copy.estimatedSizeLabel,
      value: formatBytes(sizeEvidence.bytes, locale),
      tone: sizeEvidence.provenance === 'measured' ? 'success' : 'warning',
      detail: `${formatSourceObjectMetricByteDetail(sizeEvidence.bytes, numberFormatter)}.`,
    });
  }

  return { rowCount, sizeEvidence, metrics };
}

export function buildGraphNodeVolumeMetricProjection({
  isSourceObject,
  metadata,
  data,
  locale,
}: GraphNodeVolumeMetricProjectionInput): GraphNodeVolumeMetricProjection {
  return isSourceObject
    ? buildSourceProjection(metadata, data, locale)
    : buildRuntimeProjection(metadata, data, locale);
}
