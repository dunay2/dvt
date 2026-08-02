import { RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import { CancelRunUseCase } from '../../../src/application/services/cancelRunUseCase.js';
import { TenantId } from '../../../src/domain/auth/types.js';

const commandContext: AuthorizedCommandExecutionContext = {
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
  scope: {
    resource: 'tenant',
    tenantId: TenantId.unsafe('tenant-a'),
  },
  action: { kind: 'command', name: 'run:cancel' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-19T00:00:00Z'),
};

describe('CancelRunUseCase', () => {
  it('maps cancel commands to engine.cancelRun', async () => {
    const engine = {
      cancelRun: vi.fn().mockResolvedValue(undefined),
      getRunStatus: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'RUNNING' }),
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
          providerRef: {
            provider: 'temporal' as const,
            tenantId: 'tenant-a',
            namespace: 'default',
            workflowId: 'wf-1',
            runId: 'provider-run-1',
          },
        };
      },
    };

    const useCase = new CancelRunUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute(
        {
          runId: 'run-1',
          signalType: 'CANCEL',
        },
        commandContext
      )
    ).resolves.toEqual({
      contractVersion: 'v1',
      runId: 'run-1',
      signalType: 'CANCEL',
      accepted: true,
      disposition: 'requested',
    });

    expect(engine.cancelRun).toHaveBeenCalledWith({
      provider: 'temporal',
      tenantId: 'tenant-a',
      namespace: 'default',
      workflowId: 'wf-1',
      runId: 'provider-run-1',
    });
  });

  it.each([
    ['RUNNING', 'CANCELLING', 'already_requested'],
    ['CANCELLED', undefined, 'already_cancelled'],
  ] as const)(
    'does not redispatch cancellation for %s/%s',
    async (status, substatus, disposition) => {
      const engine = {
        cancelRun: vi.fn(),
        getRunStatus: vi.fn().mockResolvedValue({
          runId: 'run-1',
          status,
          ...(substatus === undefined ? {} : { substatus }),
        }),
      };
      const stateStore = {
        getRunMetadataByRunId: vi.fn().mockResolvedValue({
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0',
          logicalAttemptId: 1,
          providerRef: {
            provider: 'temporal',
            tenantId: 'tenant-a',
            namespace: 'default',
            workflowId: 'wf-1',
            runId: 'provider-run-1',
          },
        }),
      };

      const useCase = new CancelRunUseCase(engine as never, stateStore as never);

      await expect(
        useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
      ).resolves.toMatchObject({ accepted: true, disposition });
      expect(engine.cancelRun).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['PENDING', 'dispatch_pending'],
    ['COMPLETED', 'run_terminal'],
    ['FAILED', 'run_terminal'],
  ] as const)(
    'rejects cancellation for unavailable %s runs without dispatch',
    async (status, reason) => {
      const engine = {
        cancelRun: vi.fn(),
        getRunStatus: vi.fn().mockResolvedValue({ runId: 'run-1', status }),
      };
      const stateStore = {
        getRunMetadataByRunId: vi.fn().mockResolvedValue({
          tenantId: 'tenant-a',
          projectId: 'proj-1',
          environmentId: 'env-1',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0',
          logicalAttemptId: 1,
          providerRef: {
            provider: 'temporal',
            tenantId: 'tenant-a',
            namespace: 'default',
            workflowId: 'wf-1',
            runId: 'provider-run-1',
          },
        }),
      };
      const useCase = new CancelRunUseCase(engine as never, stateStore as never);

      await expect(
        useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
      ).rejects.toMatchObject({
        name: 'RunControlUnavailableError',
        action: 'cancel',
        status,
        reason,
      });
      expect(engine.cancelRun).not.toHaveBeenCalled();
    }
  );

  it('throws when the run metadata is missing', async () => {
    const engine = {
      cancelRun: vi.fn().mockResolvedValue(undefined),
    };
    const stateStore = {
      async getRunMetadataByRunId() {
        return null;
      },
    };

    const useCase = new CancelRunUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute(
        {
          runId: 'missing-run',
          signalType: 'CANCEL',
        },
        commandContext
      )
    ).rejects.toBeInstanceOf(RunMetadataNotFoundError);

    expect(engine.cancelRun).not.toHaveBeenCalled();
  });
});
