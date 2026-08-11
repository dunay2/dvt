/** Owned concern: describe source-object metric provenance for presentation surfaces. */
import type {
  SourceObjectByteSizeBasis,
  SourceObjectByteSizeMetricValue,
  SourceObjectMetricEvidence,
  SourceObjectMetricConfidence,
  SourceObjectMetricMethod,
  SourceObjectRowCountMetric,
} from '@dvt/contracts';

type MetricEvidenceCopy = Readonly<{
  measured: string;
  estimated: string;
  using: string;
  confidence: string;
  snapshotObserved: string;
  observedWindow: string;
  windowConnector: string;
  reported: string;
  methodLabels: Readonly<Record<SourceObjectMetricMethod, string>>;
  byteSizeBasisLabels: Readonly<Record<SourceObjectByteSizeBasis, string>>;
  confidenceLabels: Readonly<Record<SourceObjectMetricConfidence, string>>;
}>;

const metricEvidenceCopyByLanguage: Readonly<Record<'en' | 'es', MetricEvidenceCopy>> = {
  en: {
    measured: 'Measured',
    estimated: 'Estimated',
    using: 'using',
    confidence: 'Confidence',
    snapshotObserved: 'Snapshot observed',
    observedWindow: 'Observed window',
    windowConnector: 'to',
    reported: 'Reported',
    methodLabels: {
      'provider-storage-metadata': 'provider storage metadata',
      'provider-statistics': 'provider statistics',
      'query-plan': 'query plan',
      'data-scan': 'data scan',
      'schema-width': 'schema width',
    },
    byteSizeBasisLabels: {
      'physical-allocation': 'Physical allocation',
      'logical-payload': 'Logical payload',
      'provider-row-storage': 'Provider row storage',
      'lower-bound': 'Lower bound',
    },
    confidenceLabels: {
      exact: 'exact',
      high: 'high',
      medium: 'medium',
      low: 'low',
    },
  },
  es: {
    measured: 'Medido',
    estimated: 'Estimado',
    using: 'mediante',
    confidence: 'Confianza',
    snapshotObserved: 'Instantánea observada',
    observedWindow: 'Ventana observada',
    windowConnector: 'a',
    reported: 'Registrado',
    methodLabels: {
      'provider-storage-metadata': 'metadatos de almacenamiento del proveedor',
      'provider-statistics': 'estadísticas del proveedor',
      'query-plan': 'plan de consulta',
      'data-scan': 'escaneo de datos',
      'schema-width': 'anchura del esquema',
    },
    byteSizeBasisLabels: {
      'physical-allocation': 'Asignación física',
      'logical-payload': 'Carga lógica',
      'provider-row-storage': 'Almacenamiento de filas del proveedor',
      'lower-bound': 'Límite inferior',
    },
    confidenceLabels: {
      exact: 'exacta',
      high: 'alta',
      medium: 'media',
      low: 'baja',
    },
  },
};

export function formatSourceObjectMetricByteSize(value: number): string {
  if (Math.abs(value) >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  if (Math.abs(value) >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }
  if (Math.abs(value) >= 1024) {
    return `${(value / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${value} B`;
}

export function formatSourceObjectMetricByteDetail(
  value: number,
  numberFormatter = new Intl.NumberFormat()
): string {
  const compact = formatSourceObjectMetricByteSize(value);
  const exact = `${numberFormatter.format(Math.round(value))} B`;
  return exact === compact ? exact : `${exact} (${compact})`;
}

function resolveMetricEvidenceCopy(locale?: string): MetricEvidenceCopy {
  return locale?.trim().toLowerCase().startsWith('es')
    ? metricEvidenceCopyByLanguage.es
    : metricEvidenceCopyByLanguage.en;
}

function describeObservation(
  evidence: SourceObjectMetricEvidence,
  copy: MetricEvidenceCopy
): string {
  const { observationScope } = evidence;
  return observationScope.kind === 'snapshot'
    ? `${copy.snapshotObserved}: ${evidence.observedAt}.`
    : `${copy.observedWindow}: ${observationScope.startedAt} ${copy.windowConnector} ${observationScope.endedAt}. ${copy.reported}: ${evidence.observedAt}.`;
}

export function describeSourceObjectMetricEvidence({
  metric,
  subject,
  evidence,
  basis,
  locale,
}: Readonly<{
  metric: SourceObjectRowCountMetric | SourceObjectByteSizeMetricValue;
  subject: string;
  evidence: SourceObjectMetricEvidence;
  basis?: SourceObjectByteSizeBasis;
  locale?: string;
}>): string {
  const copy = resolveMetricEvidenceCopy(locale);
  const provenance = metric.provenance === 'measured' ? copy.measured : copy.estimated;
  const basisDetail = basis === undefined ? '' : ` ${copy.byteSizeBasisLabels[basis]}.`;
  return `${subject}. ${provenance} ${copy.using} ${copy.methodLabels[metric.method]}.${basisDetail} ${copy.confidence}: ${copy.confidenceLabels[metric.confidence]}. ${describeObservation(evidence, copy)}`;
}
