/**
 * Owned concern: shared completed-run publication evidence for Runs acceptance tests.
 * @baseline GH-3021-RUN-PUBLICATION-SAMPLE: immutable publication identity.
 * @decision Reuse one validated evidence fixture across presentation and query tests.
 * @consequence Tests vary run scope without duplicating the publication contract.
 * @version 1.0.0
 */
import { DvtPostgresPublicationEvidenceSchema } from '@dvt/contracts';

import type { RunSnapshot } from '../../../ports/runs';

export function createRunPublicationSnapshot(overrides?: Partial<RunSnapshot>): RunSnapshot {
  return {
    runId: 'run-123',
    status: 'completed',
    tenantId: 'tenant-1',
    projectId: 'project-1',
    environment: 'env-1',
    logicalAttemptId: 1,
    publication: DvtPostgresPublicationEvidenceSchema.parse({
      evidenceType: 'dvt-postgres-publication',
      environmentId: 'env-1',
      plan: { planId: 'plan-1', planVersion: '1.0', sha256: 'a'.repeat(64) },
      workloadSha256: 'b'.repeat(64),
      semanticPlanSha256: 'c'.repeat(64),
      projection: {
        profileId: 'dvt.vtx2.postgres.project-rel.v1',
        toolIdentity: 'pgsql-deparser@16.1.1',
        schemaDigestSha256: 'd'.repeat(64),
        sqlArtifact: {
          storageUri: 'cas://sha256/' + 'e'.repeat(64),
          sha256: 'e'.repeat(64),
          sizeBytes: 128,
        },
      },
      target: {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgresql-local',
          provider: 'postgres',
        },
        schema: 'dvt',
        relation: 'orders_result',
      },
      publication: { token: 'f'.repeat(64), predecessorToken: null, outcome: 'created' },
      rowsWritten: 3,
      startedAt: '2026-09-15T10:00:01.000Z',
      completedAt: '2026-09-15T10:00:02.000Z',
      durationMs: 1000,
    }),
    ...overrides,
  };
}
