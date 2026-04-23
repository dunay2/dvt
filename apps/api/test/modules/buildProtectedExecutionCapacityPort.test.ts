/**
 * Owned concern: verify protected runtime composition binds provider-specific
 * execution-capacity probes behind the abstract port without leaking them into
 * the application contract.
 */
import { describe, expect, it, vi } from 'vitest';

import { loadEnv } from '../../src/plugins/env.js';
import { buildProtectedExecutionCapacityPort } from '../../src/modules/protectedRuntime/buildProtectedExecutionCapacityPort.js';

function buildFetchResponse(status: number, body: unknown) {
  return {
    status,
    async json() {
      return body;
    },
  };
}

describe('buildProtectedExecutionCapacityPort', () => {
  it('binds the temporal readyz probe only when temporal runtime and readyz URL are configured', async () => {
    const fetch = vi.fn(async () =>
      buildFetchResponse(200, {
        ready: true,
        runStateCircuitState: 'closed',
      })
    );
    const port = buildProtectedExecutionCapacityPort(
      loadEnv({
        TEMPORAL_ADDRESS: 'temporal.example:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt',
        DVT_TEMPORAL_WORKER_READYZ_URL: 'http://temporal-worker.example/readyz',
      }),
      { fetch }
    );

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: 'admissible',
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('keeps the fail-closed default when the temporal readyz binding is not configured', async () => {
    const port = buildProtectedExecutionCapacityPort(
      loadEnv({
        TEMPORAL_ADDRESS: 'temporal.example:7233',
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt',
      })
    );

    await expect(port.evaluate({ targetAdapter: 'temporal' })).resolves.toEqual({
      kind: 'saturated',
      reason: 'capacity_signal_unavailable',
    });
  });
});
