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
  rejectWorkerRun,
  resetWorkerRunPromise,
} = vi.hoisted(() => {
  let lastCreateArgs: unknown = null;
  let resolveRun: (() => void) | null = null;
  let rejectRun: ((error?: unknown) => void) | null = null;

  const resetWorkerRunPromise = (): void => {
    resolveRun = null;
    rejectRun = null;
    mockWorkerRun.mockImplementation(
      () =>
        new Promise<void>((resolve, reject) => {
          resolveRun = resolve;
          rejectRun = reject;
        })
    );
    mockWorkerShutdown.mockImplementation(() => {
      resolveRun?.();
    });
  };

  const mockWorkerRun = vi.fn<() => Promise<void>>();
  const mockWorkerShutdown = vi.fn<() => void>();
  const mockWorkerCreate = vi.fn(async (args: unknown) => {
    lastCreateArgs = args;
    return {
      run: mockWorkerRun,
      shutdown: mockWorkerShutdown,
    };
  });

  resetWorkerRunPromise();

  return {
    mockWorkerCreate,
    mockWorkerRun,
    mockWorkerShutdown,
    getLastCreateArgs: () => lastCreateArgs,
    rejectWorkerRun: (error?: unknown) => rejectRun?.(error),
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

  it('clears internal state and logs when worker run rejects before shutdown', async () => {
    mockWorkerRun.mockImplementationOnce(async () => {
      throw new Error('WORKER_RUN_FAILED');
    });

    const { observability, logs, metrics } = makeTrackingObservability();
    const host = makeWorkerHost({ observability });

    await host.start({} as never);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.isRunning()).toBe(false);
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

  it('is no-op on shutdown when never started', async () => {
    const host = makeWorkerHost();

    await host.shutdown();
    expect(host.isRunning()).toBe(false);
    expect(mockWorkerShutdown).not.toHaveBeenCalled();
  });
});
