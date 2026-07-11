/** Owned concern: project source-object and runtime volume evidence into graph-card metrics. */
import type {
  SourceObjectByteSizeBasis,
  SourceObjectMetricConfidence,
  SourceObjectMetricMethod,
  SourceObjectMetricObservationScope,
  SourceObjectMetricProvenance,
} from '@dvt/contracts';
import { readSourceObjectMetricEvidence } from '../../services/workspace/sourceObjectMetricEvidence';
import { describeSourceObjectMetricEvidence } from '../../services/workspace/sourceObjectMetricEvidencePresentation';
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
}>;

function formatFullNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatByteDetail(value: number): string {
  const exact = `${formatFullNumber(Math.round(value))} B`;
  const compact = formatBytes(value);
  return exact === compact ? exact : `${exact} (${compact})`;
}

function buildSourceProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): GraphNodeVolumeMetricProjection {
  const evidence = readSourceObjectMetricEvidence(metadata.sourceMetricEvidence);
  if (evidence === null) {
    return { rowCount: null, sizeEvidence: null, metrics: [] };
  }
  const { rowCount: rowEvidence, byteSize: byteEvidence } = evidence;

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
        label: 'Rows',
        value: formatCompactNumber(rowEvidence.value),
        tone: rowTone,
        detail: describeSourceObjectMetricEvidence({
          metric: rowEvidence,
          subject: `${formatFullNumber(rowEvidence.value)} rows`,
          evidence,
        }),
      },
      {
        id: byteEvidence.provenance === 'measured' ? 'bytes' : 'estimated-bytes',
        label: byteEvidence.provenance === 'measured' ? 'Size' : 'Est. size',
        value: formatBytes(byteEvidence.value),
        tone: sizeTone,
        detail: describeSourceObjectMetricEvidence({
          metric: byteEvidence,
          subject: formatByteDetail(byteEvidence.value),
          evidence,
          basis: byteEvidence.basis,
        }),
      },
    ],
  };
}

function buildRuntimeProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): GraphNodeVolumeMetricProjection {
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
      label: 'Rows',
      value: formatCompactNumber(rowCount),
      detail: `${formatFullNumber(rowCount)} rows.`,
    });
  }
  if (sizeEvidence !== null) {
    metrics.push({
      id: sizeEvidence.provenance === 'measured' ? 'bytes' : 'estimated-bytes',
      label: sizeEvidence.provenance === 'measured' ? 'Size' : 'Est. size',
      value: formatBytes(sizeEvidence.bytes),
      tone: sizeEvidence.provenance === 'measured' ? 'success' : 'warning',
      detail: `${formatByteDetail(sizeEvidence.bytes)}.`,
    });
  }

  return { rowCount, sizeEvidence, metrics };
}

export function buildGraphNodeVolumeMetricProjection({
  isSourceObject,
  metadata,
  data,
}: GraphNodeVolumeMetricProjectionInput): GraphNodeVolumeMetricProjection {
  return isSourceObject
    ? buildSourceProjection(metadata, data)
    : buildRuntimeProjection(metadata, data);
}
