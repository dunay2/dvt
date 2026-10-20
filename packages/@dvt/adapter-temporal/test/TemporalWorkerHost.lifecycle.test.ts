import { setImmediate } from 'node:timers';

import type { State } from '@temporalio/worker';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_STEP_ACTIVITY_REGISTRY,
  loadTemporalAdapterConfig,
  TemporalWorkerHost,
  type StepActivity,
  type TemporalWorkerHostConfig,
} from '../src/index.js';

import { makeTrackingObservability } from './helpers/mockObservability.js';

const {
  mockWorkerCreate,
  mockWorkerRun,
  mockWorkerShutdown,
  getLastCreateArgs,
  setWorkerState,
  completeWorkerRun,
  rejectWorkerRun,
  resetWorkerRunPromise,
} = vi.hoisted(() => {
  let lastCreateArgs: unknown = null;
  let resolveRun: (() => void) | null = null;
  let rejectRun: ((error?: unknown) => void) | null = null;
  let workerState: State = 'INITIALIZED';

  const completeWorkerRun = (): void => {
    workerState = 'STOPPED';
    resolveRun?.();
  };

  const resetWorkerRunPromise = (): void => {
    resolveRun = null;
    rejectRun = null;
    workerState = 'INITIALIZED';
    mockWorkerRun.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          workerState = 'RUNNING';
          resolveRun = resolve;
          rejectRun = reject;
        })
    );
    mockWorkerShutdown.mockImplementation(() => {
      if (workerState !== 'RUNNING') {
        throw new Error(`Not running. Current state: ${workerState}`);
      }
      workerState = 'STOPPING';
      completeWorkerRun();
    });
  };

  const mockWorkerRun = vi.fn<() => Promise<void>>();
  const mockWorkerShutdown = vi.fn<() => void>();
  const mockWorkerCreate = vi.fn(async (args: unknown) => {
    lastCreateArgs = args;
    return {
      run: mockWorkerRun,
      shutdown: mockWorkerShutdown,
      getState: () => workerState,
    };
  });

  resetWorkerRunPromise();

  return {
    mockWorkerCreate,
    mockWorkerRun,
    mockWorkerShutdown,
    getLastCreateArgs: () => lastCreateArgs,
    setWorkerState: (state: State) => {
      workerState = state;
    },
    completeWorkerRun,
    rejectWorkerRun: (error?: unknown) => {
      workerState = 'FAILED';
      rejectRun?.(error);
    },
    resetWorkerRunPromise,
  };
});

const TEST_TEMPORAL_ENV = {
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'ns-a',
  TEMPORAL_TASK_QUEUE: 'q-main',
} as const;

const TEST_WORKFLOWS_PATH = '/tmp/workflows.js';

vi.mock('@temporalio/worker', () => {
  return {
    Worker: {
      create: mockWorkerCreate,
    },
    NativeConnection: vi.fn(),
  };
});

function mkActivityDeps(): {
  runStateCommandPort: {
    bootstrapRun: ReturnType<typeof vi.fn>;
    appendTransitions: ReturnType<typeof vi.fn>;
  };
  clock: { nowIsoUtc: ReturnType<typeof vi.fn> };
  idempotency: {
    runEventKey: ReturnType<typeof vi.fn>;
    startRunIntentId: ReturnType<typeof vi.fn>;
    eventId: ReturnType<typeof vi.fn>;
  };
  planArtifactReader: { fetchForEngineDispatch: ReturnType<typeof vi.fn> };
} {
  return {
    runStateCommandPort: {
      bootstrapRun: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendTransitions: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
    },
    clock: { nowIsoUtc: vi.fn(() => '2026-03-06T00:00:00.000Z') },
    idempotency: {
      runEventKey: vi.fn(() => 'idem-key'),
      startRunIntentId: vi.fn(() => 'start-run-intent'),
      eventId: vi.fn(() => 'event-id'),
    },
    planArtifactReader: {
      fetchForEngineDispatch: vi.fn(async () => ({
        plan: {
          schemaVersion: '1.0',
          planId: 'plan-1',
          version: 'v1',
          steps: [],
        },
        executionPolicy: {},
      })),
    },
  };
}

interface WorkerHostFixtureOptions {
  identity?: string;
  workflowsPath?: string | null;
  observability?: TemporalWorkerHostConfig['observability'];
  stepActivitiesByKind?: TemporalWorkerHostConfig['stepActivitiesByKind'];
}

function makeWorkerHost(options: WorkerHostFixtureOptions = {}): TemporalWorkerHost {
  const temporalConfig = loadTemporalAdapterConfig({
    ...TEST_TEMPORAL_ENV,
    ...(options.identity === undefined ? {} : { TEMPORAL_IDENTITY: options.identity }),
  });
  const config: TemporalWorkerHostConfig = {
    temporalConfig,
    activityDeps: mkActivityDeps(),
    activityHeartbeat: () => undefined,
  };

  if (options.workflowsPath !== null) {
    config.workflowsPath = options.workflowsPath ?? TEST_WORKFLOWS_PATH;
  }
  if (options.observability !== undefined) {
    config.observability = options.observability;
  }
  if (options.stepActivitiesByKind !== undefined) {
    config.stepActivitiesByKind = options.stepActivitiesByKind;
  }

  return new TemporalWorkerHost(config);
}

function mkResolvedRunContext(): {
  tenantId: string;
  projectId: string;
  environmentId: string;
  runId: string;
  targetAdapter: 'temporal';
  logicalAttemptId: number;
  originRunId: string;
} {
  return {
    tenantId: 'tenant-1',
    projectId: 'proj-1',
    environmentId: 'env-1',
    runId: 'run-1',
    targetAdapter: 'temporal' as const,
    logicalAttemptId: 1,
    originRunId: 'run-1',
  };
}

describe('TemporalWorkerHost lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkerRunPromise();
  });

  it('starts once and wires Worker.create deterministically', async () => {
    const host = makeWorkerHost({ identity: 'worker-a' });

    await host.start({} as never);

    expect(host.isRunning()).toBe(true);
    expect(mockWorkerCreate).toHaveBeenCalledTimes(1);
    expect(mockWorkerRun).toHaveBeenCalledTimes(1);

    expect(getLastCreateArgs()).toMatchObject({
      namespace: 'ns-a',
      taskQueue: 'q-main',
      identity: 'worker-a',
      workflowsPath: '/tmp/workflows.js',
      maxHeartbeatThrottleInterval: '1s',
    });

    await host.shutdown();
    expect(host.isRunning()).toBe(false);
  });

  it('resolves the default workflow bundle path in ESM runtime', async () => {
    const host = makeWorkerHost({ workflowsPath: null });

    await host.start({} as never);

    expect(getLastCreateArgs()).toMatchObject({
      workflowsPath: expect.stringContaining('RunPlanWorkflow'),
    });

    await host.shutdown();
  });

  it('omits worker identity when the Temporal config does not define one', async () => {
    const host = makeWorkerHost();

    await host.start({} as never);

    expect(getLastCreateArgs()).not.toHaveProperty('identity');

    await host.shutdown();
  });

  it('wires registered step activities by kind into Worker.create activities', async () => {
    const pythonActivityExecute = vi.fn(async (step: { stepId: string }) => ({
      stepId: step.stepId,
      status: 'COMPLETED' as const,
    }));
    const pythonActivity: StepActivity = {
      execute: pythonActivityExecute,
    };
    const replacementActivityExecute = vi.fn(async (step: { stepId: string }) => ({
      stepId: step.stepId,
      status: 'FAILED' as const,
    }));
    const sourceRegistry = new Map(DEFAULT_STEP_ACTIVITY_REGISTRY).set(
      'PYTHON_SCRIPT',
      pythonActivity
    );

    const host = makeWorkerHost({ stepActivitiesByKind: sourceRegistry });

    await host.start({} as never);
    sourceRegistry.set('PYTHON_SCRIPT', {
      execute: replacementActivityExecute,
    });

    const created = getLastCreateArgs() as {
      activities: {
        executeStep(input: {
          step: { stepId: string; kind: string; dependsOn?: string[] };
          ctx: ReturnType<typeof mkResolvedRunContext>;
        }): Promise<{ stepId: string; status: 'COMPLETED' | 'FAILED' }>;
      };
    };

    const result = await created.activities.executeStep({
      step: { stepId: 'py-1', kind: 'PYTHON_SCRIPT', dependsOn: [] },
      ctx: mkResolvedRunContext(),
    });

    expect(result).toEqual({ stepId: 'py-1', status: 'COMPLETED' });
    expect(pythonActivityExecute).toHaveBeenCalledTimes(1);
    expect(replacementActivityExecute).not.toHaveBeenCalled();
    await host.shutdown();
  });

  it('emits observability for worker start and shutdown', async () => {
    const { observability, logs, metrics } = makeTrackingObservability();
    const host = makeWorkerHost({ observability });

    await host.start({} as never);
    await host.shutdown();

    expect(logs.info).toHaveBeenCalled();
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.started_total', {
      adapter: 'temporal',
      operation: 'start',
      result: 'ok',
    });
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.shutdown_total', {
      adapter: 'temporal',
      operation: 'shutdown',
      result: 'ok',
    });
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'ok',
    });
  });

  it('rejects double start', async () => {
    const host = makeWorkerHost();

    await host.start({} as never);
    await expect(host.start({} as never)).rejects.toThrow('TEMPORAL_WORKER_ALREADY_STARTED');
    await host.shutdown();
  });

  it('has no run completion before an SDK run starts', async () => {
    const host = makeWorkerHost();

    expect(host.getRunCompletion()).toBeNull();
    await host.shutdown();
    expect(host.getRunCompletion()).toBeNull();
  });

  it('keeps completion pending until the SDK run settles and retains the completed result', async () => {
    const host = makeWorkerHost();
    await host.start({} as never);
    const completion = host.getRunCompletion();
    expect(completion).not.toBeNull();
    const settled = vi.fn();
    void completion?.then(settled);
    await Promise.resolve();

    expect(settled).not.toHaveBeenCalled();
    expect(host.getRunCompletion()).toBe(completion);
    completeWorkerRun();

    await expect(completion).resolves.toEqual({ status: 'completed' });
    expect(host.isRunning()).toBe(false);
    await host.shutdown();
    expect(host.getRunCompletion()).toBe(completion);
    expect(mockWorkerShutdown).not.toHaveBeenCalled();
  });

  it.each([new Error('WORKER_TERMINAL_FAILURE'), { code: 'NATIVE_FAILURE' }])(
    'retains the original failed run outcome after clearing the active worker: %j',
    async (error) => {
      const host = makeWorkerHost();
      await host.start({} as never);
      const completion = host.getRunCompletion();
      rejectWorkerRun(error);

      await expect(completion).resolves.toEqual({ status: 'failed', error });
      const result = await completion;
      if (result?.status !== 'failed') throw new Error('Expected a failed SDK run');
      expect(result.error).toBe(error);
      expect(host.isRunning()).toBe(false);
      await expect(host.shutdown()).resolves.toBeUndefined();
      expect(host.getRunCompletion()).toBe(completion);
    }
  );

  it.each([
    { name: 'logger Error', sink: 'logger', diagnosticError: new Error('LOG_SINK_FAILED') },
    { name: 'counter Error', sink: 'counter', diagnosticError: new Error('METRIC_SINK_FAILED') },
    { name: 'logger undefined', sink: 'logger', diagnosticError: undefined },
    { name: 'counter null', sink: 'counter', diagnosticError: null },
  ])(
    'retains the SDK failure and diagnostic failure from $name',
    async ({ sink, diagnosticError }) => {
      const { observability, logs, metrics } = makeTrackingObservability();
      const host = makeWorkerHost({ observability });
      const error = new Error('ORIGINAL_WORKER_FAILURE');
      await host.start({} as never);
      const failingSink = sink === 'logger' ? logs.error : metrics.counter;
      failingSink.mockImplementationOnce(() => {
        throw diagnosticError;
      });
      const completion = host.getRunCompletion();
      rejectWorkerRun(error);

      await expect(completion).resolves.toEqual({ status: 'failed', error, diagnosticError });
      const result = await completion;
      if (result?.status !== 'failed') throw new Error('Expected a failed SDK run');
      expect(result.error).toBe(error);
      expect(Object.hasOwn(result, 'diagnosticError')).toBe(true);
      expect(result.diagnosticError).toBe(diagnosticError);
      expect(host.isRunning()).toBe(false);
      await expect(host.shutdown()).resolves.toBeUndefined();
      expect(host.getRunCompletion()).toBe(completion);
    }
  );

  it.each(['none', 'logger', 'counter'] as const)(
    'does not create an unhandled rejection for start and shutdown only consumers with %s diagnostic failure',
    async (sink) => {
      const unhandledRejection = vi.fn();
      process.on('unhandledRejection', unhandledRejection);
      const { observability, logs, metrics } = makeTrackingObservability();
      const host = makeWorkerHost({ observability });
      try {
        await host.start({} as never);
        if (sink !== 'none') {
          const failingSink = sink === 'logger' ? logs.error : metrics.counter;
          failingSink.mockImplementationOnce(() => {
            throw new Error('UNOBSERVED_DIAGNOSTIC_FAILURE');
          });
        }
        rejectWorkerRun(new Error('UNOBSERVED_WORKER_RUN_FAILURE'));
        await new Promise<void>((resolve) => setImmediate(resolve));

        expect(host.isRunning()).toBe(false);
        expect(unhandledRejection).not.toHaveBeenCalled();
        await expect(host.shutdown()).resolves.toBeUndefined();
      } finally {
        process.off('unhandledRejection', unhandledRejection);
      }
    }
  );

  it('keeps each explicitly restarted SDK run associated with its own completion', async () => {
    const host = makeWorkerHost();
    await host.start({} as never);
    const firstCompletion = host.getRunCompletion();
    completeWorkerRun();
    await expect(firstCompletion).resolves.toEqual({ status: 'completed' });

    resetWorkerRunPromise();
    await host.start({} as never);
    const secondCompletion = host.getRunCompletion();
    expect(secondCompletion).not.toBe(firstCompletion);
    const error = new Error('SECOND_RUN_FAILED');
    rejectWorkerRun(error);

    await expect(secondCompletion).resolves.toEqual({ status: 'failed', error });
    await expect(firstCompletion).resolves.toEqual({ status: 'completed' });
    expect(host.getRunCompletion()).toBe(secondCompletion);
  });

  it('does not expose the previous run outcome after a later worker creation fails', async () => {
    const host = makeWorkerHost();
    await host.start({} as never);
    const previousCompletion = host.getRunCompletion();
    completeWorkerRun();
    await previousCompletion;
    const error = new Error('WORKER_CREATE_FAILED');
    mockWorkerCreate.mockRejectedValueOnce(error);

    await expect(host.start({} as never)).rejects.toBe(error);
    expect(host.getRunCompletion()).toBeNull();
    expect(host.isRunning()).toBe(false);
    await expect(previousCompletion).resolves.toEqual({ status: 'completed' });
  });

  it('clears internal state and logs when worker run rejects before shutdown', async () => {
    const error = new Error('WORKER_RUN_FAILED');
    mockWorkerRun.mockImplementationOnce(async () => {
      throw error;
    });

    const { observability, logs, metrics } = makeTrackingObservability();
    const host = makeWorkerHost({ observability });

    await host.start({} as never);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(host.isRunning()).toBe(false);
    const completion = host.getRunCompletion();
    await expect(completion).resolves.toEqual({ status: 'failed', error });
    expect(logs.error).toHaveBeenCalled();
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'error',
    });
    await host.shutdown();
  });

  it('does not emit run_exit ok when shutdown races with a worker run failure', async () => {
    const { observability, metrics } = makeTrackingObservability();

    mockWorkerShutdown.mockImplementation(() => {
      rejectWorkerRun(new Error('WORKER_RUN_FAILED_DURING_SHUTDOWN'));
    });

    const host = makeWorkerHost({ observability });

    await host.start({} as never);
    await host.shutdown();

    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'error',
    });
    expect(metrics.counter).not.toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'ok',
    });
  });

  it.each(['STOPPING', 'DRAINING', 'DRAINED', 'STOPPED'] as const)(
    'waits for run finalization from %s without requesting shutdown again',
    async (state) => {
      const host = makeWorkerHost();
      await host.start({} as never);
      setWorkerState(state);

      const settled = vi.fn();
      const shutdown = host.shutdown();
      void shutdown.then(settled, settled);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWorkerShutdown).not.toHaveBeenCalled();
      expect(settled).not.toHaveBeenCalled();
      expect(host.isRunning()).toBe(true);

      completeWorkerRun();
      await expect(shutdown).resolves.toBeUndefined();
      expect(host.isRunning()).toBe(false);
      await host.shutdown();
      expect(mockWorkerShutdown).not.toHaveBeenCalled();
    }
  );

  it('waits for FAILED run finalization and preserves the recorded run error', async () => {
    const { observability, logs, metrics } = makeTrackingObservability();
    const host = makeWorkerHost({ observability });
    const runError = new Error('WORKER_RUN_FAILED_DURING_FINALIZATION');
    await host.start({} as never);
    setWorkerState('FAILED');

    const settled = vi.fn();
    const shutdown = host.shutdown();
    void shutdown.then(settled, settled);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockWorkerShutdown).not.toHaveBeenCalled();
    expect(settled).not.toHaveBeenCalled();

    rejectWorkerRun(runError);
    await expect(shutdown).resolves.toBeUndefined();
    expect(host.isRunning()).toBe(false);
    expect(logs.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Temporal worker exited with error', err: runError })
    );
    expect(metrics.counter).toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'error',
    });
    expect(metrics.counter).not.toHaveBeenCalledWith('dvt.temporal.worker.run_exit_total', {
      adapter: 'temporal',
      operation: 'runExit',
      result: 'ok',
    });
  });

  it('requests shutdown once while concurrent callers wait for the same run', async () => {
    mockWorkerShutdown.mockImplementation(() => {
      setWorkerState('DRAINING');
    });
    const host = makeWorkerHost();
    await host.start({} as never);

    const settled = vi.fn();
    const firstShutdown = host.shutdown();
    const secondShutdown = host.shutdown();
    void firstShutdown.then(settled, settled);
    void secondShutdown.then(settled, settled);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockWorkerShutdown).toHaveBeenCalledTimes(1);
    expect(settled).not.toHaveBeenCalled();

    completeWorkerRun();
    await Promise.all([firstShutdown, secondShutdown]);
    expect(settled).toHaveBeenCalledTimes(2);
    expect(host.isRunning()).toBe(false);
  });

  it('propagates genuine shutdown errors without reporting successful shutdown', async () => {
    const shutdownError = new Error('NATIVE_SHUTDOWN_FAILED');
    mockWorkerShutdown.mockImplementationOnce(() => {
      throw shutdownError;
    });
    const { observability, logs, metrics } = makeTrackingObservability();
    const host = makeWorkerHost({ observability });
    await host.start({} as never);

    await expect(host.shutdown()).rejects.toBe(shutdownError);

    expect(host.isRunning()).toBe(true);
    expect(logs.error).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'Temporal worker host shutdown failed', err: shutdownError })
    );
    expect(metrics.counter).not.toHaveBeenCalledWith('dvt.temporal.worker.shutdown_total', {
      adapter: 'temporal',
      operation: 'shutdown',
      result: 'ok',
    });
    await host.shutdown();
    expect(host.isRunning()).toBe(false);
  });

  it('is no-op on shutdown when never started', async () => {
    const host = makeWorkerHost();

    await host.shutdown();
    expect(host.isRunning()).toBe(false);
    expect(mockWorkerShutdown).not.toHaveBeenCalled();
  });
});
