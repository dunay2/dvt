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
  scope: { tenantId: TenantId.unsafe('tenant-a') },
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
          planVersion: '2.3',
          logicalAttemptId: 1,
          provider: 'mock' as const,
          providerWorkflowId: 'wf-1',
          providerRunId: 'provider-run-1',
        };
      },
      async listEvents() {
        return [
          {
            eventId: 'evt-1',
            eventType: 'RunQueued',
            runId: 'run-1',
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-1',
            planId: 'plan-1',
            planVersion: '2.3',
            engineAttemptId: 1,
            logicalAttemptId: 1,
            idempotencyKey: 'idem-1',
            emittedAt: '2026-03-19T00:00:00Z',
            persistedAt: '2026-03-19T00:00:01Z',
            runSeq: 7,
          },
        ];
      },
    };

    const useCase = new GetRunEventsUseCase(stateStore as never);

    await expect(
      useCase.execute({ runId: 'run-1', afterSeq: 6, limit: 1 }, queryContext as never)
    ).resolves.toEqual({
      items: [
        {
          eventId: 'evt-1',
          eventType: 'RunQueued',
          runId: 'run-1',
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          planId: 'plan-1',
          planVersion: '2.3',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'idem-1',
          emittedAt: '2026-03-19T00:00:00Z',
          persistedAt: '2026-03-19T00:00:01Z',
          runSeq: 7,
        },
      ],
      nextCursor: 7,
    });
  });
});
