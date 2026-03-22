import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTemporalAdapterConfig, TemporalWorkerHost } from '../src/index.js';

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
  idempotency: { runEventKey: ReturnType<typeof vi.fn>; eventId: ReturnType<typeof vi.fn> };
  fetcher: { fetch: ReturnType<typeof vi.fn> };
  integrity: { fetchAndValidate: ReturnType<typeof vi.fn> };
} {
  return {
    runStateCommandPort: {
      bootstrapRun: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendTransitions: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
    },
    clock: { nowIsoUtc: vi.fn(() => '2026-03-06T00:00:00.000Z') },
    idempotency: {
      runEventKey: vi.fn(() => 'idem-key'),
      eventId: vi.fn(() => 'event-id'),
    },
    fetcher: { fetch: vi.fn(async () => new Uint8Array()) },
    integrity: { fetchAndValidate: vi.fn(async () => new Uint8Array()) },
  };
}

describe('TemporalWorkerHost lifecycle', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkerRunPromise();
  });

  afterEach(() => {
    restoreNodeEnv(originalNodeEnv);
  });

  it('starts once and wires Worker.create deterministically', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
      TEMPORAL_IDENTITY: 'worker-a',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      workflowsPath: '/tmp/workflows.js',
    });

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

  it('emits observability for worker start and shutdown', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const { observability, logs, metrics } = makeTrackingObservability();

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      observability,
      workflowsPath: '/tmp/workflows.js',
    });

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

  it('injects host observability and runtime policy into activities when deps omit both', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const { observability, logs } = makeTrackingObservability();

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      observability,
      simulateErrorPolicy: {
        rejectInProduction: true,
        runtimeMode: 'policy-test',
      },
      workflowsPath: '/tmp/workflows.js',
    });

    await host.start({} as never);
    const createArgs = getLastCreateArgs() as {
      activities: {
        executeStep(input: unknown): Promise<unknown>;
      };
    };

    await expect(
      createArgs.activities.executeStep({
        step: {
          stepId: 's1',
          kind: 'test',
          simulateError: 'permanent',
        },
        ctx: {} as never,
      })
    ).rejects.toThrow('simulateError_not_allowed_in_production:s1');

    expect(logs.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          runtimeMode: 'policy-test',
        }),
      })
    );

    await host.shutdown();
  });

  it('prefers activityDeps policy over host policy when both are provided', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: {
        ...mkActivityDeps(),
        simulateErrorPolicy: {
          rejectInProduction: false,
          runtimeMode: 'deps-policy',
        },
      },
      simulateErrorPolicy: {
        rejectInProduction: true,
        runtimeMode: 'host-policy',
      },
      workflowsPath: '/tmp/workflows.js',
    });

    await host.start({} as never);
    const createArgs = getLastCreateArgs() as {
      activities: {
        executeStep(input: unknown): Promise<unknown>;
      };
    };

    const result = await createArgs.activities.executeStep({
      step: {
        stepId: 's1',
        kind: 'test',
        simulateError: 'noop',
      },
      ctx: {} as never,
    });
    expect(result).toEqual({ stepId: 's1', status: 'COMPLETED' });

    await host.shutdown();
  });

  it('fails start in production when host policy allows simulateError', async () => {
    process.env['NODE_ENV'] = 'production';
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      simulateErrorPolicy: {
        rejectInProduction: false,
        runtimeMode: 'test-policy',
      },
      workflowsPath: '/tmp/workflows.js',
    });

    await expect(host.start({} as never)).rejects.toThrow(
      'TEMPORAL_UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION'
    );
    expect(mockWorkerCreate).not.toHaveBeenCalled();
    expect(host.isRunning()).toBe(false);
  });

  it('fails start in production when activityDeps policy overrides host policy to allow simulateError', async () => {
    process.env['NODE_ENV'] = 'production';
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: {
        ...mkActivityDeps(),
        simulateErrorPolicy: {
          rejectInProduction: false,
          runtimeMode: 'deps-policy',
        },
      },
      simulateErrorPolicy: {
        rejectInProduction: true,
        runtimeMode: 'host-policy',
      },
      workflowsPath: '/tmp/workflows.js',
    });

    await expect(host.start({} as never)).rejects.toThrow(
      'TEMPORAL_UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION'
    );
    expect(mockWorkerCreate).not.toHaveBeenCalled();
    expect(host.isRunning()).toBe(false);
  });

  it('starts in production when simulateErrorPolicy is omitted (implicit fail-closed)', async () => {
    process.env['NODE_ENV'] = 'production';
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      workflowsPath: '/tmp/workflows.js',
    });

    await host.start({} as never);
    expect(mockWorkerCreate).toHaveBeenCalledTimes(1);
    expect(host.isRunning()).toBe(true);
    await host.shutdown();
  });

  it('prefers activityDeps observability over host observability when both are provided', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const { observability: hostObservability, logs: hostLogs } = makeTrackingObservability();
    const { observability: depsObservability, logs: depsLogs } = makeTrackingObservability();

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: {
        ...mkActivityDeps(),
        observability: depsObservability,
        simulateErrorPolicy: {
          rejectInProduction: true,
          runtimeMode: 'deps-policy',
        },
      },
      observability: hostObservability,
      workflowsPath: '/tmp/workflows.js',
    });

    await host.start({} as never);
    const createArgs = getLastCreateArgs() as {
      activities: {
        executeStep(input: unknown): Promise<unknown>;
      };
    };

    await expect(
      createArgs.activities.executeStep({
        step: {
          stepId: 's1',
          kind: 'test',
          simulateError: 'permanent',
        },
        ctx: {} as never,
      })
    ).rejects.toThrow('simulateError_not_allowed_in_production:s1');

    expect(depsLogs.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          runtimeMode: 'deps-policy',
        }),
      })
    );
    expect(hostLogs.warn).not.toHaveBeenCalled();

    await host.shutdown();
  });

  it('rejects double start', async () => {
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      workflowsPath: '/tmp/workflows.js',
    });

    await host.start({} as never);
    await expect(host.start({} as never)).rejects.toThrow('TEMPORAL_WORKER_ALREADY_STARTED');
    await host.shutdown();
  });

  it('clears internal state and logs when worker run rejects before shutdown', async () => {
    mockWorkerRun.mockImplementationOnce(async () => {
      throw new Error('WORKER_RUN_FAILED');
    });

    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const { observability, logs, metrics } = makeTrackingObservability();

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      observability,
      workflowsPath: '/tmp/workflows.js',
    });

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
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });
    const { observability, metrics } = makeTrackingObservability();

    mockWorkerShutdown.mockImplementation(() => {
      rejectWorkerRun(new Error('WORKER_RUN_FAILED_DURING_SHUTDOWN'));
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      observability,
      workflowsPath: '/tmp/workflows.js',
    });

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
    const cfg = loadTemporalAdapterConfig({
      TEMPORAL_ADDRESS: 'temporal:7233',
      TEMPORAL_NAMESPACE: 'ns-a',
      TEMPORAL_TASK_QUEUE: 'q-main',
    });

    const host = new TemporalWorkerHost({
      temporalConfig: cfg,
      activityDeps: mkActivityDeps(),
      workflowsPath: '/tmp/workflows.js',
    });

    await host.shutdown();
    expect(host.isRunning()).toBe(false);
    expect(mockWorkerShutdown).not.toHaveBeenCalled();
  });

  it('restoreNodeEnv removes NODE_ENV when original value is undefined', () => {
    process.env['NODE_ENV'] = 'production';
    restoreNodeEnv(undefined);
    expect(process.env['NODE_ENV']).toBeUndefined();
  });
});

function restoreNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env['NODE_ENV'];
    return;
  }
  process.env['NODE_ENV'] = value;
}
