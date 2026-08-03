import { RecoverySourceNotTerminalError, RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import {
  RunControlUnavailableError,
  RunRecoveryUnavailableError,
} from '../../../src/application/errors/runControlErrors.js';
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

const storedPlanRef = {
  uri: 'dvt-plan://postgres/plan-a',
  sha256: 'c'.repeat(64),
  planId: 'plan-a',
  planVersion: '1.0.0',
  schemaVersion: 'v1.0',
  sizeBytes: 4096,
};

interface TestDependencies {
  readonly engine: {
    getRunStatus: ReturnType<typeof vi.fn>;
    recoverRun: ReturnType<typeof vi.fn>;
  };
  readonly stateStore: { getRunMetadataByRunId: ReturnType<typeof vi.fn> };
  readonly planStore: { getStoredPlanRef: ReturnType<typeof vi.fn> };
  readonly executionContextReader: { read: ReturnType<typeof vi.fn> };
  readonly executionContextInheritanceWriter: { inherit: ReturnType<typeof vi.fn> };
  readonly commandCoordinator: {
    executeExclusive<T>(
      key: {
        readonly action: 'cancel' | 'recover';
        readonly tenantId: string;
        readonly runId: string;
      },
      operation: () => Promise<T>
    ): Promise<T>;
  };
  readonly executionContextRequirementResolver: { resolve: ReturnType<typeof vi.fn> };
  readonly startRunIntentStore: { getIntent: ReturnType<typeof vi.fn> };
  readonly idempotency: { startRunIntentId: ReturnType<typeof vi.fn> };
}

function createSerialCoordinator(): TestDependencies['commandCoordinator'] {
  const tails = new Map<string, Promise<void>>();
  return {
    async executeExclusive(key, operation) {
      const lockKey = `${key.action}:${key.tenantId}:${key.runId}`;
      const previous = tails.get(lockKey) ?? Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>((resolve) => {
        release = resolve;
      });
      tails.set(lockKey, current);
      await previous;
      try {
        return await operation();
      } finally {
        release();
        if (tails.get(lockKey) === current) tails.delete(lockKey);
      }
    },
  };
}

function createDependencies(): TestDependencies {
  return {
    engine: {
      getRunStatus: vi.fn().mockResolvedValue({ status: 'FAILED' }),
      recoverRun: vi.fn().mockResolvedValue({
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: 'wf-recovery-1',
        runId: 'run-recovery-1',
      }),
    },
    stateStore: {
      getRunMetadataByRunId: vi.fn(async (_tenantId: string, runId: string) =>
        runId === sourceMetadata.runId ? sourceMetadata : null
      ),
    },
    planStore: {
      getStoredPlanRef: vi.fn().mockResolvedValue(storedPlanRef),
    },
    executionContextReader: {
      read: vi.fn().mockResolvedValue({
        kind: 'trusted',
        ref: {
          uri: 'file:///run-contexts/source.json',
          sha256: 'b'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      }),
    },
    executionContextInheritanceWriter: {
      inherit: vi.fn().mockResolvedValue({
        uri: 'file:///run-contexts/recovery.json',
        sha256: 'b'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
      }),
    },
    commandCoordinator: createSerialCoordinator(),
    executionContextRequirementResolver: {
      resolve: vi.fn().mockResolvedValue('required'),
    },
    startRunIntentStore: {
      getIntent: vi.fn().mockResolvedValue({
        status: 'RESOLVED',
        engineRunRef: {
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-recovery-1',
          runId: 'run-recovery-1',
        },
      }),
    },
    idempotency: {
      startRunIntentId: vi.fn().mockReturnValue('intent-recovery-1'),
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

    expect(dependencies.planStore.getStoredPlanRef).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      planId: 'plan-a',
    });
    expect(dependencies.executionContextReader.read).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      runId: 'run-source-1',
    });
    expect(dependencies.executionContextInheritanceWriter.inherit).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      sourceRef: {
        uri: 'file:///run-contexts/source.json',
        sha256: 'b'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
      },
    });
    expect(dependencies.engine.recoverRun).toHaveBeenCalledWith(
      'run-source-1',
      {
        uri: 'dvt-plan://postgres/plan-a',
        sha256: 'c'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'plan-a',
        planVersion: '1.0.0',
        sizeBytes: 4096,
      },
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'env-a',
        runId: 'run-recovery-1',
        targetAdapter: 'temporal',
        runExecutionContextRef: {
          uri: 'file:///run-contexts/recovery.json',
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
    dependencies.planStore.getStoredPlanRef.mockResolvedValue(undefined);
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toBeInstanceOf(RunRecoveryUnavailableError);
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
    expect(dependencies.executionContextInheritanceWriter.inherit).not.toHaveBeenCalled();
  });

  it('returns the original receipt without dispatching a repeated recovery command', async () => {
    const dependencies = createDependencies();
    dependencies.stateStore.getRunMetadataByRunId.mockImplementation(
      async (_tenantId: string, runId: string) =>
        runId === 'run-recovery-1'
          ? {
              ...sourceMetadata,
              runId,
              logicalAttemptId: 2,
              parentRunId: sourceMetadata.runId,
              originRunId: sourceMetadata.runId,
            }
          : sourceMetadata
    );
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
    expect(dependencies.engine.getRunStatus).not.toHaveBeenCalled();
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
    expect(dependencies.executionContextInheritanceWriter.inherit).not.toHaveBeenCalled();
    expect(dependencies.idempotency.startRunIntentId).toHaveBeenCalledWith(
      'tenant-a',
      'run-recovery-1',
      2,
      'temporal'
    );
    expect(dependencies.startRunIntentStore.getIntent).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      intentId: 'intent-recovery-1',
    });
  });

  it('resumes replay when child metadata exists without confirmed provider dispatch', async () => {
    const dependencies = createDependencies();
    dependencies.stateStore.getRunMetadataByRunId.mockImplementation(
      async (_tenantId: string, runId: string) =>
        runId === 'run-recovery-1'
          ? {
              ...sourceMetadata,
              runId,
              logicalAttemptId: 2,
              parentRunId: sourceMetadata.runId,
              originRunId: sourceMetadata.runId,
            }
          : sourceMetadata
    );
    dependencies.startRunIntentStore.getIntent.mockResolvedValue({ status: 'PENDING' });
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).resolves.toMatchObject({
      sourceRunId: 'run-source-1',
      recoveryRunId: 'run-recovery-1',
      accepted: true,
    });
    expect(dependencies.engine.recoverRun).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent delivery of one recovery identity without consuming another attempt', async () => {
    const dependencies = createDependencies();
    let recoveryMetadata:
      | typeof sourceMetadata
      | (typeof sourceMetadata & {
          logicalAttemptId: number;
          parentRunId: string;
          originRunId: string;
        }) = sourceMetadata;
    dependencies.stateStore.getRunMetadataByRunId.mockImplementation(
      async (_tenantId: string, runId: string) => {
        if (runId === sourceMetadata.runId) return sourceMetadata;
        return runId === 'run-recovery-1' && recoveryMetadata.runId === 'run-recovery-1'
          ? recoveryMetadata
          : null;
      }
    );
    dependencies.engine.recoverRun.mockImplementation(async () => {
      recoveryMetadata = {
        ...sourceMetadata,
        runId: 'run-recovery-1',
        logicalAttemptId: 2,
        parentRunId: sourceMetadata.runId,
        originRunId: sourceMetadata.runId,
      };
      return {
        provider: 'temporal',
        tenantId: 'tenant-a',
        namespace: 'default',
        workflowId: 'wf-recovery-1',
        runId: 'run-recovery-1',
      };
    });
    const useCase = new RecoverRunUseCase(dependencies as never);
    const command = { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' };

    const results = await Promise.all([
      useCase.execute(command, commandContext),
      useCase.execute(command, commandContext),
    ]);

    expect(results[0]).toEqual(results[1]);
    expect(dependencies.engine.recoverRun).toHaveBeenCalledTimes(1);
    expect(dependencies.executionContextInheritanceWriter.inherit).toHaveBeenCalledTimes(1);
  });

  it('rejects recovery when the source context has no original trusted reference', async () => {
    const dependencies = createDependencies();
    dependencies.executionContextReader.read.mockResolvedValue({
      kind: 'untrusted',
      reason: 'reference_missing',
    });
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toMatchObject({ reason: 'source_context_untrusted' });
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
    expect(dependencies.executionContextInheritanceWriter.inherit).not.toHaveBeenCalled();
  });

  it('rejects an absent context when the persisted plan requires plugin binding', async () => {
    const dependencies = createDependencies();
    dependencies.executionContextReader.read.mockResolvedValue({ kind: 'absent' });
    dependencies.executionContextRequirementResolver.resolve.mockResolvedValue('required');
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).rejects.toMatchObject({ reason: 'source_context_untrusted' });
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
  });

  it('recovers a plan that does not require an execution context when none was stored', async () => {
    const dependencies = createDependencies();
    dependencies.executionContextReader.read.mockResolvedValue({ kind: 'absent' });
    dependencies.executionContextRequirementResolver.resolve.mockResolvedValue('not_required');
    const useCase = new RecoverRunUseCase(dependencies as never);

    await expect(
      useCase.execute(
        { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
        commandContext
      )
    ).resolves.toMatchObject({ accepted: true });
    expect(dependencies.engine.recoverRun).toHaveBeenCalledWith(
      'run-source-1',
      storedPlanRef,
      expect.not.objectContaining({ runExecutionContextRef: expect.anything() })
    );
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

  it('rejects completed source runs before resolving recovery artifacts', async () => {
    const dependencies = createDependencies();
    dependencies.engine.getRunStatus.mockResolvedValue({ status: 'COMPLETED' });
    const useCase = new RecoverRunUseCase(dependencies as never);

    const recovery = useCase.execute(
      { sourceRunId: 'run-source-1', recoveryRunId: 'run-recovery-1' },
      commandContext
    );

    await expect(recovery).rejects.toBeInstanceOf(RunControlUnavailableError);
    await expect(recovery).rejects.toMatchObject({
      action: 'recover',
      status: 'COMPLETED',
      reason: 'run_completed',
    });
    expect(dependencies.planStore.getStoredPlanRef).not.toHaveBeenCalled();
    expect(dependencies.executionContextReader.read).not.toHaveBeenCalled();
    expect(dependencies.engine.recoverRun).not.toHaveBeenCalled();
  });
});
