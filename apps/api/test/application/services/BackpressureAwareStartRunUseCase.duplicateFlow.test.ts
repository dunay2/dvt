/**
 * Owned concern: verify duplicate-detection ordering and duplicate short
 * circuit behavior in `BackpressureAwareStartRunUseCase`.
 */
import {
  START_RUN_DUPLICATE_OF,
  START_RUN_RESULT_KIND,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { BackpressureAwareStartRunUseCase } from '../../../src/application/services/BackpressureAwareStartRunUseCase.js';

import {
  COMMAND,
  CONTEXT,
  executeWithoutDelegate,
  expectSuccessfulResult,
} from './BackpressureAwareStartRunUseCase.test.support.js';

describe('BackpressureAwareStartRunUseCase duplicate flow', () => {
  it('runs duplicate probe before admission, delegate, and telemetry', async () => {
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
            value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
          };
        },
      },
    });

    const result = await useCase.execute(COMMAND, CONTEXT);

    expectSuccessfulResult(result, {
      kind: START_RUN_RESULT_KIND.accepted,
      runId: 'run-1',
      accepted: true,
    });
    expect(calls).toEqual(['duplicate', 'admission', 'capacity', 'delegate', 'telemetry']);
  });

  it('returns duplicate before admission and delegate', async () => {
    const admissionGuard = { assertAdmissible: vi.fn() };
    const { result, telemetry } = await executeWithoutDelegate({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'found_intent' as const, runId: 'run-1' };
        },
      },
      admissionGuard,
    });

    expectSuccessfulResult(result, {
      kind: START_RUN_RESULT_KIND.duplicate,
      runId: 'run-1',
      accepted: true,
      duplicateOf: START_RUN_DUPLICATE_OF.intent,
    });
    expect(admissionGuard.assertAdmissible).not.toHaveBeenCalled();
    expect(telemetry.record).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'duplicate',
        duplicateOf: 'intent',
      })
    );
  });
});
