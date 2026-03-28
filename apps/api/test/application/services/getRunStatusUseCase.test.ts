import { describe, expect, it } from 'vitest';

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
  scope: { tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'query', name: 'run:view' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('GetRunStatusUseCase', () => {
  it('loads metadata and returns the projected engine status', async () => {
    const engine = {
      async getRunStatus(runRef: unknown) {
        expect(runRef).toEqual({
          provider: 'mock',
          tenantId: 'tenant-a',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        });
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
        };
      },
      async enrichRunStatus() {
        throw new Error('should not be called');
      },
    };

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
          provider: 'mock' as const,
          providerWorkflowId: 'wf-1',
          providerRunId: 'provider-run-1',
        };
      },
    };

    const useCase = new GetRunStatusUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute({ runId: 'run-1', enriched: false }, queryContext as never)
    ).resolves.toEqual({
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: false,
    });
  });

  it('uses the enriched path when requested', async () => {
    const engine = {
      async getRunStatus() {
        throw new Error('should not be called');
      },
      async enrichRunStatus() {
        return {
          runId: 'provider-run-1',
          status: 'RUNNING' as const,
          substatus: 'mock/QUEUED' as const,
        };
      },
    };

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
          provider: 'mock' as const,
          providerWorkflowId: 'wf-1',
          providerRunId: 'provider-run-1',
        };
      },
    };

    const useCase = new GetRunStatusUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute({ runId: 'run-1', enriched: true }, queryContext as never)
    ).resolves.toEqual({
      runId: 'provider-run-1',
      tenantId: 'tenant-a',
      status: 'RUNNING',
      enriched: true,
      substatus: 'mock/QUEUED',
    });
  });
});
