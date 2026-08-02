import { RecoverySourceNotTerminalError, RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { RunRecoveryUnavailableError } from '../../../src/application/errors/runControlErrors.js';
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

const sourceMetadata = {
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
};

const planRecord = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  planId: 'plan-a',
  canonicalPlanJson: '{}',
  canonicalHash: 'a'.repeat(64),
  planVersion: '1.0.0',
  schemaVersion: 'v1.0',
  contractVersion: 'v1.0',
  sourceRef: 'https://plans.example/plan.json',
  createdAtIso: '2026-04-08T00:00:00.000Z',
  updatedAtIso: '2026-04-08T00:00:00.000Z',
  state: 'ACTIVE' as const,
};

interface TestDependencies {
  readonly engine: { recoverRun: ReturnType<typeof vi.fn> };
  readonly stateStore: { getRunMetadataByRunId: ReturnType<typeof vi.fn> };
  readonly planStore: { getPlanRecord: ReturnType<typeof vi.fn> };
  readonly executionContextReader: { read: ReturnType<typeof vi.fn> };
}

function createDependencies(): TestDependencies {
  return {
    engine: {
      recoverRun: vi.fn().mockResolvedValue({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: 'wf-recovery-1',
        runId: 'run-recovery-1',
      }),
    },
    stateStore: {
      getRunMetadataByRunId: vi.fn().mockResolvedValue(sourceMetadata),
    },
    planStore: {
      getPlanRecord: vi.fn().mockResolvedValue(planRecord),
    },
    executionContextReader: {
      read: vi.fn().mockResolvedValue({
        uri: 'file:///run-contexts/source.json',
        sha256: 'b'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
      }),
    },
  };
}

describe('RecoverRunUseCase', () => {
  it('derives the immutable plan, adapter, and execution context from server-owned source data', async () => {
    const dependencies = createDependencies();
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).resolves.toEqual({
      contractVersion: 'v1',
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      accepted: true,
    });

    expect(dependencies.planStore.getPlanRecord).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      planId: 'plan-a',
    });
    expect(dependencies.executionContextReader.read).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      runId: 'run-source-1',
    });
    expect(dependencies.engine.recoverRun).toHaveBeenCalledWith(
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
        runExecutionContextRef: {
          uri: 'file:///run-contexts/source.json',
          sha256: 'b'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      }
    );
  });

  it('rejects recovery when the persisted source plan is unavailable', async () => {
    const dependencies = createDependencies();
    dependencies.planStore.getPlanRecord.mockResolvedValue(undefined);
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toBeInstanceOf(RunRecoveryUnavailableError);
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
  });

  it('throws run-not-found when source metadata does not exist', async () => {
    const dependencies = createDependencies();
    dependencies.stateStore.getRunMetadataByRunId.mockResolvedValue(null);
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'missing-run', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toBeInstanceOf(RunMetadataNotFoundError);
  });

  it('preserves the engine terminal-state guard', async () => {
    const dependencies = createDependencies();
    dependencies.engine.recoverRun.mockRejectedValue(
      new RecoverySourceNotTerminalError('run-source-1', 'RUNNING')
    );
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toBeInstanceOf(RecoverySourceNotTerminalError);
  });
});
