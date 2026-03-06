import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockWorkerCreate, mockWorkerRun, mockWorkerShutdown, getLastCreateArgs } = vi.hoisted(
  () => {
    let lastCreateArgs: unknown = null;

    const mockWorkerRun = vi.fn(async () => undefined);
    const mockWorkerShutdown = vi.fn(() => undefined);
    const mockWorkerCreate = vi.fn(async (args: unknown) => {
      lastCreateArgs = args;
      return {
        run: mockWorkerRun,
        shutdown: mockWorkerShutdown,
      };
    });

    return {
      mockWorkerCreate,
      mockWorkerRun,
      mockWorkerShutdown,
      getLastCreateArgs: () => lastCreateArgs,
    };
  }
);

vi.mock('@temporalio/worker', () => {
  return {
    Worker: {
      create: mockWorkerCreate,
    },
    NativeConnection: vi.fn(),
  };
});

import { loadTemporalAdapterConfig, TemporalWorkerHost } from '../src/index.js';

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
