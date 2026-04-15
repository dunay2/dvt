import { describe, expect, it, vi } from 'vitest';

import { CircuitBreakingRunStateCommandPort } from '../src/RunStateCommandPortCircuitBreaker.js';

describe('CircuitBreakingRunStateCommandPort', () => {
  it('trips open after threshold failures and fast-fails while open', async () => {
    let now = 0;
    const delegate = {
      bootstrapRun: vi.fn(async () => {
        throw new Error('db unavailable');
      }),
      appendTransitions: vi.fn(async () => {
        throw new Error('db unavailable');
      }),
    };

    const breaker = new CircuitBreakingRunStateCommandPort({
      delegate,
      failureThreshold: 2,
      openDurationMs: 5000,
      operationTimeoutMs: 100,
      nowEpochMs: () => now,
    });

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_STORE_UNAVAILABLE:appendTransitions/
    );
    expect(breaker.getSnapshot().state).toBe('closed');

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_STORE_UNAVAILABLE:appendTransitions/
    );
    const openSnapshot = breaker.getSnapshot();
    expect(openSnapshot.state).toBe('open');
    expect(openSnapshot.tripCount).toBe(1);

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_CIRCUIT_OPEN:appendTransitions/
    );
    expect(delegate.appendTransitions).toHaveBeenCalledTimes(2);
    expect(breaker.getSnapshot().rejectionCount).toBe(1);
  });

  it('transitions half-open and closes on successful probe', async () => {
    let now = 0;
    const delegate = {
      bootstrapRun: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendTransitions: vi
        .fn<
          (
            runId: string,
            events: unknown[]
          ) => Promise<{ appended: unknown[]; deduped: unknown[]; lastSeq: number }>
        >()
        .mockImplementationOnce(async () => {
          throw new Error('first failure');
        })
        .mockImplementationOnce(async () => ({ appended: [], deduped: [], lastSeq: 1 })),
    };

    const breaker = new CircuitBreakingRunStateCommandPort({
      delegate,
      failureThreshold: 1,
      openDurationMs: 1000,
      operationTimeoutMs: 100,
      nowEpochMs: () => now,
    });

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_STORE_UNAVAILABLE:appendTransitions/
    );
    expect(breaker.getSnapshot().state).toBe('open');

    now = 1500;
    await expect(breaker.appendTransitions('run-1', [])).resolves.toMatchObject({ lastSeq: 1 });

    const snapshot = breaker.getSnapshot();
    expect(snapshot.state).toBe('closed');
    expect(snapshot.consecutiveFailures).toBe(0);
    expect(snapshot.halfOpenProbeCount).toBe(1);
  });

  it('records timeout failures as retryable state-store errors', async () => {
    const delegate = {
      bootstrapRun: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendTransitions: vi.fn(
        () =>
          new Promise<{ appended: unknown[]; deduped: unknown[]; lastSeq: number }>((resolve) => {
            setTimeout(() => resolve({ appended: [], deduped: [], lastSeq: 1 }), 25);
          })
      ),
    };

    const breaker = new CircuitBreakingRunStateCommandPort({
      delegate,
      failureThreshold: 3,
      openDurationMs: 1000,
      operationTimeoutMs: 5,
    });

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_STORE_UNAVAILABLE:appendTransitions/
    );
    const snapshot = breaker.getSnapshot();
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.timeoutCount).toBe(1);
  });

  it('anchors open cooldown to the failure timestamp, not operation start', async () => {
    let now = 0;
    const delegate = {
      bootstrapRun: vi.fn(async () => ({ appended: [], deduped: [], lastSeq: 0 })),
      appendTransitions: vi.fn(async () => {
        now = 750;
        throw new Error('db unavailable');
      }),
    };

    const breaker = new CircuitBreakingRunStateCommandPort({
      delegate,
      failureThreshold: 1,
      openDurationMs: 1000,
      operationTimeoutMs: 100,
      nowEpochMs: () => now,
    });

    await expect(breaker.appendTransitions('run-1', [])).rejects.toThrow(
      /RUN_STATE_STORE_UNAVAILABLE:appendTransitions/
    );

    const snapshot = breaker.getSnapshot();
    expect(snapshot.state).toBe('open');
    expect(snapshot.openUntilEpochMs).toBe(1750);
  });
});
