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

type PlanStoreReaderDouble = Readonly<{
  getStoredPlanRef: ReturnType<typeof vi.fn>;
  getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
  fetchStoredPlanArtifact: ReturnType<typeof vi.fn>;
  fetchStoredPlanArtifactForValidation: ReturnType<typeof vi.fn>;
}>;

function createPlanStoreReader(getStoredPlanRef: ReturnType<typeof vi.fn>): PlanStoreReaderDouble {
  return {
    getStoredPlanRef,
    getStoredPlanValidationRecord: vi.fn(),
    fetchStoredPlanArtifact: vi.fn(),
    fetchStoredPlanArtifactForValidation: vi.fn(),
  };
}

const registeredTargetAdapterRegistry = {
  isSupported: vi.fn().mockReturnValue(true),
  listSupported: vi.fn().mockReturnValue(['temporal']),
};

describe('ListRunsUseCase', () => {
  it('filters by authorized scope and projects the same canonical operational truth as detail', async () => {
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
    };
    const engine = {
      getRunStatus: vi.fn(async () => ({
        runId: 'provider-run-1',
        status: 'FAILED' as const,
        startedAt: '2026-03-19T00:00:05Z',
        completedAt: '2026-03-19T00:00:20Z',
        execution: {
          failure: {
            stepId: 'step-load',
            reason: 'SINK_WRITE_FAILED',
            failedAt: '2026-03-19T00:00:19Z',
          },
          materialization: {
            executor: 'postgres',
            environmentId: 'env-1',
            sinkTable: 'analytics.orders',
            rowsWritten: 42,
            startedAt: '2026-03-19T00:00:10Z',
            completedAt: '2026-03-19T00:00:18Z',
            durationMs: 8000,
          },
        },
      })),
    };

    const executionContextReader = {
      read: vi.fn().mockResolvedValue({
        kind: 'untrusted',
        reason: 'reference_missing',
      }),
    };
    const useCase = new ListRunsUseCase(
      stateStore as never,
      engine as never,
      executionContextReader as never,
      undefined,
      createPlanStoreReader(vi.fn().mockResolvedValue({})) as never,
      { fetchAndValidate: vi.fn().mockResolvedValue({}) } as never,
      registeredTargetAdapterRegistry as never
    );

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
          controls: {
            cancel: { available: false, reason: 'run_terminal' },
            recover: { available: false, reason: 'source_context_untrusted' },
          },
          startedAt: '2026-03-19T00:00:05Z',
          completedAt: '2026-03-19T00:00:20Z',
          durationMs: 15000,
          execution: {
            failure: {
              stepId: 'step-load',
              reason: 'SINK_WRITE_FAILED',
              failedAt: '2026-03-19T00:00:19Z',
            },
          },
          failedStepId: 'step-load',
          errorReason: 'SINK_WRITE_FAILED',
        },
      ],
      nextCursor: null,
    });
    expect(engine.getRunStatus).toHaveBeenCalledOnce();
    expect(executionContextReader.read).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      runId: 'run-1',
    });
  });

  it('bounds canonical status reads while preserving list order', async () => {
    const metadata = Array.from({ length: 18 }, (_, index) => ({
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
    }));
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
      { listRuns: vi.fn().mockResolvedValue(metadata) } as never,
      engine as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(maximumActiveReads).toBeLessThanOrEqual(8);
    expect(result.items.map((item) => item.runId)).toEqual(metadata.map((item) => item.runId));
  });

  it('bounds recovery plan validation while preserving list order', async () => {
    const metadata = Array.from({ length: 10 }, (_, index) => ({
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
    }));
    let activeValidations = 0;
    let maximumActiveValidations = 0;
    const planIntegrityValidator = {
      async fetchAndValidate() {
        activeValidations += 1;
        maximumActiveValidations = Math.max(maximumActiveValidations, activeValidations);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeValidations -= 1;
        return {};
      },
    };
    const useCase = new ListRunsUseCase(
      { listRuns: vi.fn().mockResolvedValue(metadata) } as never,
      {
        getRunStatus: vi.fn().mockImplementation(async ({ runId }: { runId: string }) => ({
          runId,
          status: 'CANCELLED' as const,
        })),
      } as never,
      undefined,
      undefined,
      createPlanStoreReader(
        vi.fn().mockImplementation(async ({ planId }: { planId: string }) => ({ planId }))
      ) as never,
      planIntegrityValidator as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(maximumActiveValidations).toBeLessThanOrEqual(4);
    expect(result.items.map((item) => item.runId)).toEqual(metadata.map((item) => item.runId));
  });

  it('fails closed when a recoverable run has no stored source plan', async () => {
    const metadata = {
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
    const planStore = createPlanStoreReader(vi.fn().mockResolvedValue(undefined));
    const useCase = new ListRunsUseCase(
      { listRuns: vi.fn().mockResolvedValue([metadata]) } as never,
      {
        getRunStatus: vi.fn().mockResolvedValue({
          runId: 'provider-run-1',
          status: 'CANCELLED',
        }),
      } as never,
      undefined,
      undefined,
      planStore as never,
      { fetchAndValidate: vi.fn() } as never,
      registeredTargetAdapterRegistry as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(result.items[0]?.controls.recover).toEqual({
      available: false,
      reason: 'source_plan_unavailable',
    });
    expect(planStore.getStoredPlanRef).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'proj-1',
      environmentId: 'env-1',
      planId: 'plan-1',
    });
  });

  it('fails closed when the stored source plan fails canonical integrity validation', async () => {
    const metadata = {
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
    const planRef = { planId: 'plan-1' };
    const planStore = createPlanStoreReader(vi.fn().mockResolvedValue(planRef));
    const planIntegrityValidator = {
      fetchAndValidate: vi.fn().mockRejectedValue(new Error('PLAN_INTEGRITY_VALIDATION_FAILED')),
    };
    const useCase = new ListRunsUseCase(
      { listRuns: vi.fn().mockResolvedValue([metadata]) } as never,
      {
        getRunStatus: vi.fn().mockResolvedValue({
          runId: 'provider-run-1',
          status: 'FAILED',
        }),
      } as never,
      undefined,
      undefined,
      planStore as never,
      planIntegrityValidator as never,
      registeredTargetAdapterRegistry as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(result.items[0]?.controls.recover).toEqual({
      available: false,
      reason: 'source_plan_unavailable',
    });
    expect(planIntegrityValidator.fetchAndValidate).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-a',
        projectId: 'proj-1',
        environmentId: 'env-1',
        planRef,
      },
      planStore
    );
  });

  it('fails closed when the source runtime adapter is not registered', async () => {
    const metadata = {
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
    const planStore = createPlanStoreReader(vi.fn().mockResolvedValue({ planId: 'plan-1' }));
    const useCase = new ListRunsUseCase(
      { listRuns: vi.fn().mockResolvedValue([metadata]) } as never,
      {
        getRunStatus: vi.fn().mockResolvedValue({
          runId: 'provider-run-1',
          status: 'FAILED',
        }),
      } as never,
      undefined,
      undefined,
      planStore as never,
      { fetchAndValidate: vi.fn().mockResolvedValue({}) } as never,
      { isSupported: vi.fn().mockReturnValue(false), listSupported: vi.fn() } as never
    );

    const result = await useCase.execute({ limit: 25 }, queryContext as never);

    expect(result.items[0]?.controls.recover).toEqual({
      available: false,
      reason: 'source_adapter_unavailable',
    });
  });
});
