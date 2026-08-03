import { RunMetadataNotFoundError } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/auth.js';
import type { IRunCancellationReceiptStore } from '../../../src/application/ports/runCancellationReceiptStore.js';
import type { IRunControlCommandCoordinator } from '../../../src/application/ports/runControlCommandCoordinator.js';
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

const RUN_METADATA = {
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

function createStateStore(): { getRunMetadataByRunId: ReturnType<typeof vi.fn> } {
  return {
    getRunMetadataByRunId: vi.fn().mockResolvedValue(RUN_METADATA),
  };
}

function createSerialCoordinator(): IRunControlCommandCoordinator {
  const tails = new Map<string, Promise<void>>();
  return {
    async executeExclusive<T>(
      key: { action: 'cancel' | 'recover'; tenantId: string; runId: string },
      operation: () => Promise<T>
    ): Promise<T> {
      const lockKey = `${key.action}:${key.tenantId}:${key.runId}`;
      const previous = tails.get(lockKey) ?? Promise.resolve();
      const gate = deferred();
      tails.set(lockKey, gate.promise);
      await previous;
      try {
        return await operation();
      } finally {
        gate.resolve();
        if (tails.get(lockKey) === gate.promise) tails.delete(lockKey);
      }
    },
  };
}

function createUseCase(
  engine: unknown,
  stateStore: unknown,
  startDispatchResolver?: unknown,
  cancellationReceipts: IRunCancellationReceiptStore = createCancellationReceiptStore()
): CancelRunUseCase {
  return new CancelRunUseCase(
    engine as never,
    stateStore as never,
    createSerialCoordinator(),
    cancellationReceipts,
    startDispatchResolver as never
  );
}

function createCancellationReceiptStore(): IRunCancellationReceiptStore {
  const accepted = new Set<string>();
  const keyOf = (tenantId: string, runId: string): string => `${tenantId}:${runId}`;
  return {
    async hasAccepted(key) {
      return accepted.has(keyOf(key.tenantId, key.runId));
    },
    async recordAccepted(metadata) {
      accepted.add(keyOf(metadata.tenantId, metadata.runId));
    },
  };
}

describe('CancelRunUseCase', () => {
  it('maps cancel commands to engine.cancelRun', async () => {
    const engine = {
      cancelRun: vi.fn().mockResolvedValue(undefined),
      getRunStatus: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'RUNNING' }),
    };
    const stateStore = createStateStore();

    const useCase = createUseCase(engine, stateStore);

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

  it('dispatches one provider cancellation for concurrent deliveries of the same command', async () => {
    const providerGate = deferred();
    const engine = {
      cancelRun: vi.fn(async () => {
        await providerGate.promise;
      }),
      getRunStatus: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'RUNNING' }),
    };
    const useCase = createUseCase(engine, createStateStore());
    const command = { runId: 'run-1', signalType: 'CANCEL' as const };

    const first = useCase.execute(command, commandContext);
    const second = useCase.execute(command, commandContext);
    await vi.waitFor(() => expect(engine.cancelRun).toHaveBeenCalled());
    providerGate.resolve();

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ disposition: 'requested' }),
      expect.objectContaining({ disposition: 'already_requested' }),
    ]);
    expect(engine.cancelRun).toHaveBeenCalledOnce();
  });

  it('cancels a pending run through its confirmed provider dispatch reference', async () => {
    const dispatchedRunRef = {
      ...RUN_METADATA.providerRef,
      workflowId: 'actual-workflow',
      runId: 'actual-provider-run',
    };
    const engine = {
      cancelRun: vi.fn().mockResolvedValue(undefined),
      getRunStatus: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'PENDING' }),
    };
    const dispatchResolver = {
      resolve: vi.fn().mockResolvedValue({ kind: 'confirmed', runRef: dispatchedRunRef }),
    };
    const useCase = createUseCase(engine, createStateStore(), dispatchResolver);

    await expect(
      useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
    ).resolves.toMatchObject({ accepted: true, disposition: 'requested' });
    expect(engine.cancelRun).toHaveBeenCalledWith(dispatchedRunRef);
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
      const stateStore = createStateStore();

      const useCase = createUseCase(engine, stateStore);

      await expect(
        useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
      ).resolves.toMatchObject({ accepted: true, disposition });
      expect(engine.cancelRun).not.toHaveBeenCalled();
    }
  );

  it('reconciles a terminal race when the provider rejects cancellation', async () => {
    const providerFailure = new Error('workflow is already closed');
    const engine = {
      cancelRun: vi.fn().mockRejectedValue(providerFailure),
      getRunStatus: vi
        .fn()
        .mockResolvedValueOnce({ runId: 'run-1', status: 'RUNNING' })
        .mockResolvedValueOnce({ runId: 'run-1', status: 'COMPLETED' }),
    };
    const stateStore = createStateStore();
    const useCase = createUseCase(engine, stateStore);

    await expect(
      useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
    ).rejects.toMatchObject({
      name: 'RunControlUnavailableError',
      action: 'cancel',
      status: 'COMPLETED',
      reason: 'run_terminal',
    });
    expect(engine.getRunStatus).toHaveBeenCalledTimes(2);
  });

  it('returns the settled receipt when cancellation wins the provider race', async () => {
    const engine = {
      cancelRun: vi.fn().mockRejectedValue(new Error('workflow is already closed')),
      getRunStatus: vi
        .fn()
        .mockResolvedValueOnce({ runId: 'run-1', status: 'RUNNING' })
        .mockResolvedValueOnce({ runId: 'run-1', status: 'CANCELLED' }),
    };
    const stateStore = createStateStore();
    const useCase = createUseCase(engine, stateStore);

    await expect(
      useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
    ).resolves.toMatchObject({ accepted: true, disposition: 'already_cancelled' });
  });

  it.each(['RUNNING', 'PENDING'] as const)(
    'preserves the provider failure when canonical state reconciles to %s',
    async (reconciledStatus) => {
      const providerFailure = new Error('temporal transport unavailable');
      const engine = {
        cancelRun: vi.fn().mockRejectedValue(providerFailure),
        getRunStatus: vi
          .fn()
          .mockResolvedValueOnce({ runId: 'run-1', status: 'RUNNING' })
          .mockResolvedValueOnce({ runId: 'run-1', status: reconciledStatus }),
      };
      const useCase = createUseCase(engine, createStateStore());

      await expect(
        useCase.execute({ runId: 'run-1', signalType: 'CANCEL' }, commandContext)
      ).rejects.toBe(providerFailure);
    }
  );

  it.each([
    ['PENDING', undefined, 'dispatch_pending'],
    ['COMPLETED', undefined, 'run_terminal'],
    ['FAILED', undefined, 'run_terminal'],
    ['FAILED', 'CANCELLING', 'run_terminal'],
  ] as const)(
    'rejects cancellation for unavailable %s/%s runs without dispatch',
    async (status, substatus, reason) => {
      const engine = {
        cancelRun: vi.fn(),
        getRunStatus: vi.fn().mockResolvedValue({
          runId: 'run-1',
          status,
          ...(substatus === undefined ? {} : { substatus }),
        }),
      };
      const stateStore = createStateStore();
      const useCase = createUseCase(engine, stateStore);

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

    const useCase = createUseCase(engine, stateStore);

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

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
