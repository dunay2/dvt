import { RecoverySourceNotTerminalError, RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import { RecoverRunUseCase } from '../../../src/application/services/recoverRunUseCase.js';
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
  scope: { resource: 'tenant', tenantId: TenantId.unsafe('tenant-a') },
  action: { kind: 'command', name: 'run:retry' },
  requestId: 'req-1',
  authorizedAt: new Date('2026-04-08T00:00:00Z'),
};

describe('RecoverRunUseCase', () => {
  it('maps recover command to engine.recoverRun using source run context', async () => {
    const engine = {
      recoverRun: vi.fn().mockResolvedValue({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: 'wf-recovery-1',
        runId: 'run-recovery-1',
      }),
    };
    const stateStore = {
      getRunMetadataByRunId: vi.fn().mockResolvedValue({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
        runId: 'run-source-1',
        planId: 'plan-a',
        planVersion: '1.0.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal' as const,
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        },
      }),
    };

    const useCase = new RecoverRunUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute(
        {
          sourceRunId: 'run-source-1',
          recoveryRunId: 'run-recovery-1',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        commandContext
      )
    ).resolves.toEqual({
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      accepted: true,
    });

    expect(engine.recoverRun).toHaveBeenCalledWith(
      'run-source-1',
      {
        uri: 'https://plans.example/plan.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
      },
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
        runId: 'run-recovery-1',
        targetAdapter: 'temporal',
      }
    );
  });

  it('throws run-not-found when source metadata does not exist', async () => {
    const useCase = new RecoverRunUseCase(
      { recoverRun: vi.fn() } as never,
      { getRunMetadataByRunId: vi.fn().mockResolvedValue(null) } as never
    );

    await expect(
      useCase.execute(
        {
          sourceRunId: 'missing-run',
          recoveryRunId: 'run-recovery-1',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        commandContext
      )
    ).rejects.toBeInstanceOf(RunMetadataNotFoundError);
  });

  it('rejects recover when the source run is not terminal', async () => {
    const engine = {
      recoverRun: vi
        .fn()
        .mockRejectedValue(new RecoverySourceNotTerminalError('run-source-1', 'RUNNING')),
    };
    const stateStore = {
      getRunMetadataByRunId: vi.fn().mockResolvedValue({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
        runId: 'run-source-1',
        planId: 'plan-a',
        planVersion: '1.0.0',
        logicalAttemptId: 1,
        providerRef: {
          provider: 'temporal' as const,
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-1',
          runId: 'provider-run-1',
        },
      }),
    };

    const useCase = new RecoverRunUseCase(engine as never, stateStore as never);

    await expect(
      useCase.execute(
        {
          sourceRunId: 'run-source-1',
          recoveryRunId: 'run-recovery-1',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        commandContext
      )
    ).rejects.toBeInstanceOf(RecoverySourceNotTerminalError);
    expect(engine.recoverRun).toHaveBeenCalledTimes(1);
  });
});
