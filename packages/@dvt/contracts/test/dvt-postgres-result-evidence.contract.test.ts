import { describe, expect, it } from 'vitest';

import { StepResultEvidenceSchema } from '../src/index.js';

const EVIDENCE = {
  evidenceType: 'dvt-postgres-publication',
  environmentId: 'env-a',
  plan: {
    planId: 'plan-a',
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
      storageUri: `s3://dvt-artifacts/tenants/tenant-a/${'e'.repeat(64)}`,
      sha256: 'e'.repeat(64),
      sizeBytes: 64,
    },
  },
  target: {
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-a',
      provider: 'postgres',
    },
    schema: 'analytics',
    relation: 'orders_result',
  },
  publication: {
    token: 'f'.repeat(64),
    predecessorToken: null,
    outcome: 'created',
  },
  rowsWritten: 3,
  startedAt: '2026-09-15T00:00:00.000Z',
  completedAt: '2026-09-15T00:00:01.000Z',
  durationMs: 1000,
} as const;

describe('DVT PostgreSQL result evidence', () => {
  it('preserves the complete authoritative execution identity', () => {
    expect(StepResultEvidenceSchema.parse(EVIDENCE)).toEqual(EVIDENCE);
  });

  it('rejects evidence without the immutable workload identity', () => {
    const { workloadSha256: _workloadSha256, ...incomplete } = EVIDENCE;

    expect(StepResultEvidenceSchema.safeParse(incomplete).success).toBe(false);
  });
});
