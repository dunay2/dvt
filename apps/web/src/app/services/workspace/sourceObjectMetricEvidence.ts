/** Owned concern: parse source-object metric evidence at web read boundaries. */
import { SourceObjectMetricEvidenceSchema, type SourceObjectMetricEvidence } from '@dvt/contracts';

export function readSourceObjectMetricEvidence(value: unknown): SourceObjectMetricEvidence | null {
  const parsed = SourceObjectMetricEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
