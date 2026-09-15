import {
  DvtPostgresPublicationEvidenceSchema,
  type CanonicalRunStatus,
  type DvtPostgresPublicationEvidence,
  type EventEnvelope,
} from '@dvt/contracts';

export function deriveDvtPostgresPublicationEvidence(
  status: CanonicalRunStatus['status'],
  events: ReadonlyArray<EventEnvelope>
): DvtPostgresPublicationEvidence | undefined {
  if (status !== 'COMPLETED') {
    return undefined;
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const parsed = DvtPostgresPublicationEvidenceSchema.safeParse(
      events[index]?.payload?.['resultEvidence']
    );
    if (parsed.success) {
      return parsed.data;
    }
  }

  return undefined;
}
