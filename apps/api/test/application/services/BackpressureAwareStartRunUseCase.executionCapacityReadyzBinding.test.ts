/**
 * Owned concern: verify the real temporal-readyz execution-capacity binding
 * produces caller-visible canonical admission results through the start-run
 * admission orchestrator.
 */
import { START_RUN_BACKPRESSURE_CODE } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { TemporalWorkerReadyzExecutionCapacityPort } from '../../../src/infrastructure/executionCapacity/TemporalWorkerReadyzExecutionCapacityPort.js';

import {
  COMMAND,
  CONTEXT,
  buildUseCase,
  buildDelegateSpy,
  buildTelemetrySpy,
  expectSuccessfulResult,
} from './BackpressureAwareStartRunUseCase.test.support.js';

function buildFetchResponse(
  status: number,
  body: unknown
): {
  readonly status: number;
  json(): Promise<unknown>;
} {
  return {
    status,
    async json() {
      return body;
    },
  };
}

describe('BackpressureAwareStartRunUseCase temporal readyz execution-capacity binding', () => {
  it('returns system backpressure when temporal readyz reports the executor unavailable', async () => {
    const delegate = buildDelegateSpy();
    const telemetry = buildTelemetrySpy();
    const executionCapacity = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () =>
        buildFetchResponse(503, {
          ready: false,
          runStateCircuitState: 'open',
        })
      ),
    });
    const useCase = buildUseCase({
      executionCapacity,
      telemetry,
      delegate,
      mode: 'enforce',
    });

    const result = await useCase.execute(
      {
        ...COMMAND,
        targetAdapter: 'temporal',
      },
      CONTEXT
    );

    expectSuccessfulResult(result, {
      kind: 'system_backpressure',
      accepted: false,
      code: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
      retryAfterSeconds: 30,
    });
    expect(delegate.execute).not.toHaveBeenCalled();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'reject_system',
        code: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
      })
    );
  });

  it('returns system backpressure when the temporal readyz signal is unavailable', async () => {
    const delegate = buildDelegateSpy();
    const telemetry = buildTelemetrySpy();
    const executionCapacity = new TemporalWorkerReadyzExecutionCapacityPort({
      readyzUrl: 'http://temporal-worker.example/readyz',
      fetch: vi.fn(async () => {
        throw new Error('socket hang up');
      }),
    });
    const useCase = buildUseCase({
      executionCapacity,
      telemetry,
      delegate,
      mode: 'enforce',
    });

    const result = await useCase.execute(
      {
        ...COMMAND,
        targetAdapter: 'temporal',
      },
      CONTEXT
    );

    expectSuccessfulResult(result, {
      kind: 'system_backpressure',
      accepted: false,
      code: START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
      retryAfterSeconds: 30,
    });
    expect(delegate.execute).not.toHaveBeenCalled();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'reject_system',
        code: START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
      })
    );
  });
});
