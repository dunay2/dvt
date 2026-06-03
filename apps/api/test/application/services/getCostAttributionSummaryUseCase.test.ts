import { describe, expect, it } from 'vitest';

import type { AuthorizedExecutionContext } from '../../../src/application/ports/auth.js';
import { GetCostAttributionSummaryUseCase } from '../../../src/application/services/getCostAttributionSummaryUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

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
    assertedProjectIds: [],
  },
  scope: { resource: 'tenant', tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'query', name: 'run:list' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-05-24T00:00:00Z'),
};

describe('GetCostAttributionSummaryUseCase', () => {
  it('derives cost attribution usage facts from tenant-scoped run events without inventing money', async () => {
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
          },
          {
            tenantId: 'tenant-a',
            projectId: 'proj-1',
            environmentId: 'env-2',
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
      async getSnapshot() {
        return null;
      },
      async listEvents(_tenantId: string, runId: string) {
        if (runId === 'run-2') {
          return [];
        }

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
            emittedAt: '2026-05-24T10:00:00.000Z',
            persistedAt: '2026-05-24T10:00:01.000Z',
            payloadVersion: 1,
            stepId: 'step-a',
            payload: {
              resultEvidence: {
                durationMs: 1250,
                rowsWritten: 10,
              },
            },
            runSeq: 1,
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
            emittedAt: '2026-05-24T10:02:00.000Z',
            persistedAt: '2026-05-24T10:02:01.000Z',
            payloadVersion: 1,
            stepId: 'step-b',
            payload: {
              durationMs: 750,
            },
            runSeq: 2,
          },
        ];
      },
    };

    const result = await new GetCostAttributionSummaryUseCase(stateStore as never).execute(
      { limit: 20 },
      queryContext as never
    );

    expect(result).toEqual({
      tenantId: 'tenant-a',
      projectId: null,
      environmentId: null,
      runCount: 2,
      completedStepCount: 1,
      failedStepCount: 1,
      totalStepDurationMs: 2000,
      totalCostAmount: null,
      currency: null,
      costCaptureStatus: 'unavailable',
      observedWindow: {
        firstEventAt: '2026-05-24T10:00:00.000Z',
        lastEventAt: '2026-05-24T10:02:00.000Z',
      },
      runs: [
        {
          runId: 'run-1',
          projectId: 'proj-1',
          environmentId: 'env-1',
          planId: 'plan-1',
          planVersion: '1.0',
          status: null,
          completedStepCount: 1,
          failedStepCount: 1,
          totalStepDurationMs: 2000,
          costAmount: null,
          currency: null,
        },
        {
          runId: 'run-2',
          projectId: 'proj-1',
          environmentId: 'env-2',
          planId: 'plan-2',
          planVersion: '1.0',
          status: null,
          completedStepCount: 0,
          failedStepCount: 0,
          totalStepDurationMs: 0,
          costAmount: null,
          currency: null,
        },
      ],
      steps: [
        {
          runId: 'run-1',
          stepId: 'step-a',
          eventType: 'StepCompleted',
          durationMs: 1250,
          costAmount: null,
          currency: null,
        },
        {
          runId: 'run-1',
          stepId: 'step-b',
          eventType: 'StepFailed',
          durationMs: 750,
          costAmount: null,
          currency: null,
        },
      ],
      nextCursor: null,
    });
  });

  it('filters attribution by authorized project and environment scope', async () => {
    const calls: string[] = [];
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
          },
          {
            tenantId: 'tenant-a',
            projectId: 'proj-2',
            environmentId: 'env-9',
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
      async getSnapshot() {
        return { status: 'COMPLETED' };
      },
      async listEvents(_tenantId: string, runId: string) {
        calls.push(runId);
        return [];
      },
    };

    const context = {
      ...queryContext,
      scope: {
        resource: 'environment',
        tenantId: TenantId.unsafe('tenant-a'),
        projectId: { value: 'proj-1' },
        environmentId: { value: 'env-1' },
      },
    };

    const result = await new GetCostAttributionSummaryUseCase(stateStore as never).execute(
      { limit: 20 },
      context as never
    );

    expect(calls).toEqual(['run-1']);
    expect(result.projectId).toBe('proj-1');
    expect(result.environmentId).toBe('env-1');
    expect(result.runCount).toBe(1);
  });
});
