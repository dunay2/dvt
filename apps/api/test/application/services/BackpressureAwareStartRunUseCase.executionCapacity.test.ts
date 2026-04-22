/**
 * Owned concern: verify execution-capacity admission semantics for
 * `BackpressureAwareStartRunUseCase`.
 */
import { START_RUN_BACKPRESSURE_CODE } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  type StartRunExecutionCapacityResult,
} from '../../../src/application/ports/IStartRunExecutionCapacityPort.js';
import { BackpressureAwareStartRunUseCase } from '../../../src/application/services/BackpressureAwareStartRunUseCase.js';

import {
  ACCEPTED_RESULT,
  COMMAND,
  CONTEXT,
  buildUseCase,
  expectSuccessfulResult,
} from './BackpressureAwareStartRunUseCase.test.support.js';

const EXECUTION_CAPACITY_REJECTION_CASES = [
  {
    reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable,
    expectedCode: START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
    expectedRetryAfterSeconds: 30,
  },
  {
    reason: START_RUN_EXECUTION_CAPACITY_REASON.capacityExhausted,
    expectedCode: START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted,
    expectedRetryAfterSeconds: 12,
  },
  {
    reason: START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
    expectedCode: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
    expectedRetryAfterSeconds: 10,
  },
] as const;

describe('BackpressureAwareStartRunUseCase execution-capacity admission', () => {
  it('evaluates execution capacity after duplicate and backpressure admission, before delegate', async () => {
    const calls: string[] = [];
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          calls.push('duplicate');
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          calls.push('admission');
        },
      },
      executionCapacity: {
        async evaluate() {
          calls.push('capacity');
          return { kind: 'admissible' as const };
        },
      },
      telemetry: {
        async record() {
          calls.push('telemetry');
        },
      },
      mode: 'enforce',
      retryAfterSeconds: 30,
      delegate: {
        async execute() {
          calls.push('delegate');
          return {
            ok: true as const,
            value: ACCEPTED_RESULT,
          };
        },
      },
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expectSuccessfulResult(result, ACCEPTED_RESULT);
    expect(calls).toEqual(['duplicate', 'admission', 'capacity', 'delegate', 'telemetry']);
  });

  it.each(EXECUTION_CAPACITY_REJECTION_CASES)(
    'returns system backpressure in enforce mode for execution-capacity reason=%s',
    async ({ reason, expectedCode, expectedRetryAfterSeconds }) => {
      const delegate = { execute: vi.fn() };
      const telemetry = { record: vi.fn().mockResolvedValue(undefined) };
      const useCase = buildUseCase({
        executionCapacity: {
          async evaluate() {
            const saturatedResult = {
              kind: 'saturated' as const,
              reason,
            };

            if (reason === START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable) {
              return saturatedResult satisfies Extract<
                StartRunExecutionCapacityResult,
                { readonly kind: 'saturated' }
              >;
            }

            return {
              ...saturatedResult,
              retryAfterSeconds: expectedRetryAfterSeconds,
            } satisfies Extract<StartRunExecutionCapacityResult, { readonly kind: 'saturated' }>;
          },
        },
        telemetry,
        mode: 'enforce',
        retryAfterSeconds: 30,
        delegate,
      });

      const result = await useCase.execute(COMMAND, CONTEXT);

      expectSuccessfulResult(result, {
        kind: 'system_backpressure',
        accepted: false,
        code: expectedCode,
        retryAfterSeconds: expectedRetryAfterSeconds,
      });
      expect(delegate.execute).not.toHaveBeenCalled();
      expect(telemetry.record).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'reject_system',
          code: expectedCode,
          retryAfterSeconds: expectedRetryAfterSeconds,
        })
      );
    }
  );

  it('observe mode records the capacity rejection and still delegates', async () => {
    const telemetry = { record: vi.fn().mockResolvedValue(undefined) };
    const delegate = {
      execute: vi.fn().mockResolvedValue({
        ok: true as const,
        value: ACCEPTED_RESULT,
      }),
    };
    const useCase = buildUseCase({
      executionCapacity: {
        async evaluate() {
          return {
            kind: 'saturated' as const,
            reason: START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable,
            retryAfterSeconds: 10,
          };
        },
      },
      telemetry,
      mode: 'observe',
      retryAfterSeconds: 30,
      delegate,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expectSuccessfulResult(result, ACCEPTED_RESULT);
    expect(delegate.execute).toHaveBeenCalledOnce();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'would_reject_system',
        code: START_RUN_BACKPRESSURE_CODE.executorUnavailable,
        retryAfterSeconds: 10,
      })
    );
  });
});
