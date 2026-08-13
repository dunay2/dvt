import { describe, expect, it, vi } from 'vitest';

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

function metadata(index = 1) {
  return {
    tenantId: 'tenant-a',
    projectId: 'proj-1',
    environmentId: 'env-1',
    runId: `run-${index}`,
    planId: `plan-${index}`,
    planVersion: '1.0',
    logicalAttemptId: 1,
    providerRef: {
      provider: 'temporal' as const,
      tenantId: 'tenant-a',
      namespace: 'default',
      workflowId: `wf-${index}`,
      runId: `provider-run-${index}`,
    },
    createdAt: '2026-03-19T00:00:00Z',
  };
}

describe('ListRunsUseCase', () => {
  it('queries storage with authorized scope and projects recovery evidence as unknown', async () => {
    const stateStore = {
      listRuns: vi.fn().mockResolvedValue([metadata()]),
      getSnapshot: vi.fn(),
      listEvents: vi.fn(),
    };
    const engine = {
      getRunStatus: vi.fn().mockResolvedValue({
        runId: 'provider-run-1',
        status: 'FAILED',
      }),
    };
    const useCase = new ListRunsUseCase(stateStore as never, engine as never);

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(stateStore.listRuns).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'proj-1',
      environmentId: 'env-1',
      limit: 25,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.controls).toEqual({
      cancel: { available: false, reason: 'run_terminal' },
      recover: { available: false, reason: 'recovery_evidence_unknown' },
    });
    expect(stateStore.getSnapshot).not.toHaveBeenCalled();
    expect(stateStore.listEvents).not.toHaveBeenCalled();
  });

  it('bounds canonical status reads while preserving list order', async () => {
    const items = Array.from({ length: 18 }, (_, index) => metadata(index));
    let activeReads = 0;
    let maximumActiveReads = 0;
    const engine = {
      async getRunStatus(runRef: { runId: string }) {
        activeReads += 1;
        maximumActiveReads = Math.max(maximumActiveReads, activeReads);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeReads -= 1;
        return { runId: runRef.runId, status: 'PENDING' as const };
      },
    };
    const useCase = new ListRunsUseCase(
      { listRuns: vi.fn().mockResolvedValue(items) } as never,
      engine as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(maximumActiveReads).toBeLessThanOrEqual(8);
    expect(result.items.map((item) => item.runId)).toEqual(items.map((item) => item.runId));
    expect(result.items.every((item) => item.controls.cancel.available === false)).toBe(true);
  });
});
