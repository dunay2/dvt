import {
  DvtPostgresPublicationEvidenceSchema,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';

export function parseDvtPostgresPublicationEvidence(
  value: unknown
): DvtPostgresPublicationEvidence | undefined {
  const parsed = DvtPostgresPublicationEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
