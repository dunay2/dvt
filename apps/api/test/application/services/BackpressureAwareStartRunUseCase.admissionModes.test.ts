/**
 * Owned concern: verify delivery-admission mode semantics for
 * `BackpressureAwareStartRunUseCase`.
 */
import { START_RUN_BACKPRESSURE_CODE, START_RUN_RESULT_KIND } from '@dvt/contracts';
import {
  BackpressureSnapshotUnavailableError,
  SystemBackpressureError,
  TenantBackpressureError,
} from '@dvt/delivery';
import { describe, expect, it, vi } from 'vitest';

import {
  ACCEPTED_RESULT,
  COMMAND,
  CONTEXT,
  buildUseCase,
  executeWithoutDelegate,
  expectSuccessfulResult,
} from './BackpressureAwareStartRunUseCase.test.support.js';

describe('BackpressureAwareStartRunUseCase admission modes', () => {
  const enforceModeBackpressureCases = [
    {
      description: 'returns tenant backpressure in enforce mode and does not call delegate',
      overrides: {
        admissionGuard: {
          async assertAdmissible() {
            throw new TenantBackpressureError('tenant-1', {
              pendingEventsPerTenant: 10,
              outboxOldestAgeMs: 0,
            });
          },
        },
      },
      expected: {
        kind: START_RUN_RESULT_KIND.tenantBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.tenant,
        retryAfterSeconds: 30,
      },
    },
    {
      description: 'returns system backpressure in enforce mode on snapshot failure',
      overrides: {
        admissionGuard: {
          async assertAdmissible() {
            throw new BackpressureSnapshotUnavailableError('tenant-1', new Error('db timeout'));
          },
        },
        retryAfterSeconds: 45,
      },
      expected: {
        kind: START_RUN_RESULT_KIND.systemBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
        retryAfterSeconds: 45,
      },
    },
  ] as const;

  it.each(enforceModeBackpressureCases)('$description', async ({ overrides, expected }) => {
    const { result } = await executeWithoutDelegate(overrides);
    expectSuccessfulResult(result, expected);
  });

  it('observe mode records hypothetical reject and still delegates', async () => {
    const delegate = {
      execute: vi.fn().mockResolvedValue({
        ok: true as const,
        value: ACCEPTED_RESULT,
      }),
    };
    const telemetry = { record: vi.fn().mockResolvedValue(undefined) };
    const useCase = buildUseCase({
      admissionGuard: {
        async assertAdmissible() {
          throw new SystemBackpressureError({
            pendingEventsPerTenant: 0,
            outboxOldestAgeMs: 99_000,
          });
        },
      },
      telemetry,
      mode: 'observe',
      delegate,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expectSuccessfulResult(result, ACCEPTED_RESULT);
    expect(delegate.execute).toHaveBeenCalledOnce();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'would_reject_system',
        code: START_RUN_BACKPRESSURE_CODE.system,
      })
    );
  });

  it('mode=off skips admission guard entirely', async () => {
    const admissionGuard = { assertAdmissible: vi.fn() };
    const useCase = buildUseCase({
      admissionGuard,
      mode: 'off',
    });

    await useCase.execute(COMMAND, CONTEXT);

    expect(admissionGuard.assertAdmissible).not.toHaveBeenCalled();
  });

  it('mode=off delegates to engine and records accept telemetry', async () => {
    const telemetry = { record: vi.fn().mockResolvedValue(undefined) };
    const delegate = {
      execute: vi.fn().mockResolvedValue({
        ok: true as const,
        value: ACCEPTED_RESULT,
      }),
    };
    const useCase = buildUseCase({
      telemetry,
      mode: 'off',
      delegate,
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expectSuccessfulResult(result, ACCEPTED_RESULT);
    expect(delegate.execute).toHaveBeenCalledOnce();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'accept', mode: 'off' })
    );
  });
});
