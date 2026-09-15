import {
  DvtPostgresPublicationEvidenceSchema,
  type DvtPostgresPublicationEvidence,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { GetRunStatusUseCase } from '../../../src/application/services/getRunStatusUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const queryContext: AuthorizedExecutionContext<{ kind: 'query'; name: 'run:view' }> = {
  principal: {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: [],
  },
  scope: { resource: 'tenant', tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'query', name: 'run:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-09-15T00:00:00Z'),
};

function publicationEvidence(
  relation: string,
  tokenCharacter: string
): DvtPostgresPublicationEvidence {
  return DvtPostgresPublicationEvidenceSchema.parse({
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
      relation,
    },
    publication: {
      token: tokenCharacter.repeat(64),
      predecessorToken: null,
      outcome: 'created',
    },
    rowsWritten: 3,
    startedAt: '2026-09-15T10:00:01.000Z',
    completedAt: '2026-09-15T10:00:02.000Z',
    durationMs: 1000,
  });
}

function completedEvent(
  logicalAttemptId: number,
  resultEvidence: unknown
): Record<string, unknown> {
  return {
    eventId: `evt-completed-${logicalAttemptId}`,
    eventType: 'StepCompleted',
    runId: 'run-1',
    tenantId: 'tenant-a',
    projectId: 'proj-1',
    environmentId: 'env-1',
    planId: 'plan-1',
    planVersion: '1.0',
    engineAttemptId: logicalAttemptId,
    logicalAttemptId,
    idempotencyKey: `idem-completed-${logicalAttemptId}`,
    payloadVersion: 1,
    emittedAt: `2026-09-15T10:00:0${logicalAttemptId}.000Z`,
    persistedAt: `2026-09-15T10:00:0${logicalAttemptId}.100Z`,
    runSeq: logicalAttemptId,
    stepId: 'step-publish',
    payload: { resultEvidence },
  };
}

describe('GetRunStatusUseCase DVT PostgreSQL evidence', () => {
  it('projects publication evidence from the latest completed logical attempt', async () => {
    const currentEvidence = publicationEvidence('orders_current', '2');
    const listEvents = vi
      .fn()
      .mockResolvedValue([
        completedEvent(1, publicationEvidence('orders_old', '1')),
        completedEvent(2, currentEvidence),
      ]);
    const stateStore = {
      getRunMetadataByRunId: vi.fn().mockResolvedValue({
        tenantId: 'tenant-a',
        projectId: 'proj-1',
        environmentId: 'env-1',
        runId: 'run-1',
        planId: 'plan-1',
        planVersion: '1.0',
        logicalAttemptId: 2,
        providerRef: {
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        },
      }),
      getSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: 1,
        runId: 'run-1',
        status: 'COMPLETED',
        paused: false,
        cancelling: false,
        steps: {},
      }),
      listEvents,
    };
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'COMPLETED',
        startedAt: '2026-09-15T10:00:00.000Z',
        completedAt: '2026-09-15T10:00:02.000Z',
      }),
    };
    const useCase = new GetRunStatusUseCase(engine as never, engine as never, stateStore as never);

    const result = await useCase.execute(
      { runId: 'run-1', enriched: false },
      queryContext as never
    );

    expect(listEvents).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ publication: currentEvidence });
    expect(result).not.toMatchObject({
      publication: { target: { relation: 'orders_old' } },
    });
  });
});
