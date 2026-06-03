/**
 * Owned concern: verify Temporal worker `readyz` projection into canonical
 * start-run execution-capacity semantics.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  START_RUN_EXECUTION_CAPACITY_RESULT_KIND,
} from '../../../src/application/ports/IStartRunExecutionCapacityPort.js';
import { TemporalWorkerReadyzExecutionCapacityPort } from '../../../src/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.js';

type FetchResponseLike = {
  readonly status: number;
  json(): Promise<unknown>;
};

function buildFetchResponse(status: number, body: unknown): FetchResponseLike {
  return {
    status,
    async json() {
      return body;
    },
  };
}

describe('TemporalWorkerReadyzExecutionCapacityPort', () => {
  it('returns admissible when the temporal worker reports ready=true', async () => {
    const port = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () =>
        buildFetchResponse(200, {
          ready: true,
          runStateCircuitState: 'closed',
        })
      ),
    });

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.admissible,
    });
  });

  it('returns executor_unavailable when the temporal worker responds but is not ready', async () => {
    const port = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () =>
        buildFetchResponse(503, {
          ready: false,
          runStateCircuitState: 'open',
        })
      ),
    });

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
      reason: START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
    });
  });

  it('fails closed with capacity_signal_unavailable when the readyz probe cannot be queried', async () => {
    const port = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () => {
        throw new Error('connect ECONNREFUSED');
      }),
    });

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
      reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
    });
  });

  it('fails closed with capacity_signal_unavailable when the readyz body is not usable', async () => {
    const port = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () => buildFetchResponse(200, { ok: true })),
    });

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated,
      reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
    });
  });
});
