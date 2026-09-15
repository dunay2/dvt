import { describe, expect, it } from 'vitest';

import { mapUnknownRecordToSnapshot } from './runsApiSnapshotMapper';

const publication = {
  evidenceType: 'dvt-postgres-publication',
  environmentId: 'env-1',
  plan: {
    planId: 'plan-1',
    planVersion: '1.0',
    sha256: 'a'.repeat(64),
  },
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
  publication: {
    token: 'f'.repeat(64),
    predecessorToken: null,
    outcome: 'created',
  },
  rowsWritten: 3,
  startedAt: '2026-09-15T10:00:01.000Z',
  completedAt: '2026-09-15T10:00:02.000Z',
  durationMs: 1000,
} as const;

describe('runsApiSnapshotMapper DVT PostgreSQL evidence', () => {
  it('preserves valid publication evidence from the run snapshot', () => {
    expect(
      mapUnknownRecordToSnapshot({
        runId: 'run-1',
        status: 'COMPLETED',
        publication,
      })?.publication
    ).toEqual(publication);
  });

  it('omits malformed publication evidence', () => {
    expect(
      mapUnknownRecordToSnapshot({
        runId: 'run-1',
        status: 'COMPLETED',
        publication: { ...publication, workloadSha256: 'invalid' },
      })?.publication
    ).toBeUndefined();
  });
});
