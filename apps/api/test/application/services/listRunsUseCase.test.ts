import { describe, expect, it } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { ListRunsUseCase } from '../../../src/application/services/listRunsUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const queryContext: AuthorizedExecutionContext<{ kind: 'query'; name: 'run:list' }> = {
  principal: {
    principalId: 'user-1',
    subjectId: 'user-1',
    issuer: 'issuer',
    audience: 'audience',
    principalType: 'user',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: ['tenant-a'],
    assertedProjectIds: ['proj-1'],
  },
  scope: {
    resource: 'environment',
    tenantId: TenantId.unsafe('tenant-a'),
    projectId: ProjectId.unsafe('proj-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'query', name: 'run:list' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('ListRunsUseCase', () => {
  it('filters metadata by authorized scope and attaches snapshot status', async () => {
    const stateStore = {
      async listRuns() {
        return [
          {
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
            createdAt: '2026-03-19T00:00:00Z',
          },
          {
            tenantId: 'tenant-a',
            projectId: 'proj-2',
            environmentId: 'env-1',
            runId: 'run-2',
            planId: 'plan-2',
            planVersion: '1.0',
            logicalAttemptId: 1,
            providerRef: {
              provider: 'temporal' as const,
              tenantId: 'tenant-a',
              namespace: 'default',
              workflowId: 'wf-2',
              runId: 'provider-run-2',
            },
          },
        ];
      },
      async getSnapshot(_tenantId: string, runId: string) {
        return runId === 'run-1' ? { status: 'FAILED' as const } : null;
      },
    };

    const useCase = new ListRunsUseCase(stateStore as never);

    await expect(useCase.execute({ limit: 25 }, queryContext as never)).resolves.toEqual({
      items: [
        {
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0',
          logicalAttemptId: 1,
          provider: 'temporal',
          createdAt: '2026-03-19T00:00:00Z',
          status: 'FAILED',
        },
      ],
      nextCursor: null,
    });
  });
});
