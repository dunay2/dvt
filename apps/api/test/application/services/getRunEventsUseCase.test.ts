import { describe, expect, it } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { GetRunEventsUseCase } from '../../../src/application/services/getRunEventsUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const queryContext: AuthorizedExecutionContext<{ kind: 'query'; name: 'run:logs:view' }> = {
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
  action: { kind: 'query', name: 'run:logs:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('GetRunEventsUseCase', () => {
  it('returns tenant-scoped events and nextCursor', async () => {
    const stateStore = {
      async getRunMetadataByRunId() {
        return {
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0',
          logicalAttemptId: 1,
          providerRef: {
            provider: 'temporal' as const,
            tenantId: 'tenant-a',
            namespace: 'default',
            workflowId: 'wf-1',
            runId: 'provider-run-1',
          },
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-1',
            eventType: 'StepCompleted',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-1',
            emittedAt: '2026-03-19T00:00:00Z',
            persistedAt: '2026-03-19T00:00:01Z',
            payloadVersion: 1,
            stepId: 'step-evidence',
            payload: {
              resultEvidence: {
                executor: 'postgres',
                environmentId: 'env-1',
                sinkTable: 'analytics.orders_daily',
                rowsWritten: 42,
                startedAt: '2026-03-19T00:00:00Z',
                completedAt: '2026-03-19T00:00:01Z',
                durationMs: 1000,
              },
            },
            runSeq: 7,
          },
          {
            eventId: 'evt-2',
            eventType: 'StepFailed',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '1.0',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-2',
            emittedAt: '2026-03-19T00:00:02Z',
            persistedAt: '2026-03-19T00:00:03Z',
            payloadVersion: 1,
            stepId: 'step-transform',
            payload: {
              reason: 'SINK_WRITE_FAILED',
              message: 'duplicate key value violates unique constraint',
            },
            runSeq: 8,
          },
        ];
      },
    };

    const useCase = new GetRunEventsUseCase(stateStore as never);

    await expect(
      useCase.execute({ runId: 'run-1', afterSeq: 6, limit: 2 }, queryContext as never)
    ).resolves.toEqual({
      items: [
        {
          eventId: 'evt-1',
          eventType: 'StepCompleted',
          runId: 'run-1',
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          planId: 'plan-1',
          planVersion: '1.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'idem-1',
          emittedAt: '2026-03-19T00:00:00Z',
          persistedAt: '2026-03-19T00:00:01Z',
          payloadVersion: 1,
          stepId: 'step-evidence',
          payload: {
            resultEvidence: {
              executor: 'postgres',
              environmentId: 'env-1',
              sinkTable: 'analytics.orders_daily',
              rowsWritten: 42,
              startedAt: '2026-03-19T00:00:00Z',
              completedAt: '2026-03-19T00:00:01Z',
              durationMs: 1000,
            },
          },
          runSeq: 7,
        },
        {
          eventId: 'evt-2',
          eventType: 'StepFailed',
          runId: 'run-1',
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          planId: 'plan-1',
          planVersion: '1.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'idem-2',
          emittedAt: '2026-03-19T00:00:02Z',
          persistedAt: '2026-03-19T00:00:03Z',
          payloadVersion: 1,
          stepId: 'step-transform',
          payload: {
            reason: 'SINK_WRITE_FAILED',
            message: 'duplicate key value violates unique constraint',
          },
          runSeq: 8,
        },
      ],
      nextCursor: 8,
    });
  });
});
