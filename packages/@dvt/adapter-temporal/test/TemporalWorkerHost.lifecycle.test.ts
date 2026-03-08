import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkerRunPromise();
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
});
