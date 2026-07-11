/** Owned concern: describe source-object metric provenance for presentation surfaces. */
import type {
  SourceObjectByteSizeBasis,
  SourceObjectByteSizeMetricValue,
  SourceObjectMetricEvidence,
  SourceObjectMetricMethod,
  SourceObjectRowCountMetric,
} from '@dvt/contracts';

const methodLabels: Record<SourceObjectMetricMethod, string> = {
  'provider-storage-metadata': 'provider storage metadata',
  'provider-statistics': 'provider statistics',
  'query-plan': 'query plan',
  'data-scan': 'data scan',
  'schema-width': 'schema width',
};

const byteSizeBasisLabels: Record<SourceObjectByteSizeBasis, string> = {
  'physical-allocation': 'Physical allocation',
  'logical-payload': 'Logical payload',
  'provider-row-storage': 'Provider row storage',
  'lower-bound': 'Lower bound',
};

function describeObservation(evidence: SourceObjectMetricEvidence): string {
  const { observationScope } = evidence;
  return observationScope.kind === 'snapshot'
    ? `Snapshot observed: ${evidence.observedAt}.`
    : `Observed window: ${observationScope.startedAt} to ${observationScope.endedAt}. Reported: ${evidence.observedAt}.`;
}

export function describeSourceObjectMetricEvidence({
  metric,
  subject,
  evidence,
  basis,
}: Readonly<{
  metric: SourceObjectRowCountMetric | SourceObjectByteSizeMetricValue;
  subject: string;
  evidence: SourceObjectMetricEvidence;
  basis?: SourceObjectByteSizeBasis;
}>): string {
  const provenance = metric.provenance === 'measured' ? 'Measured' : 'Estimated';
  const basisDetail = basis === undefined ? '' : ` ${byteSizeBasisLabels[basis]}.`;
  return `${subject}. ${provenance} using ${methodLabels[metric.method]}.${basisDetail} Confidence: ${metric.confidence}. ${describeObservation(evidence)}`;
}
