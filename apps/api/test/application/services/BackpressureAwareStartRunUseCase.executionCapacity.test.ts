import { parsePlanRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  type StartRunExecutionCapacityResult,
} from '../../../src/application/ports/IStartRunExecutionCapacityPort.js';
import { START_RUN_BACKPRESSURE_CODE } from '../../../src/application/ports/startRunResultContract.js';
import { BackpressureAwareStartRunUseCase } from '../../../src/application/services/BackpressureAwareStartRunUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

const COMMAND = {
  planRef: parsePlanRef({
    uri: 'https://plans.example.com/plan.json',
    sha256: 'deadbeef',
    schemaVersion: '1.0.0',
    planId: 'plan-1',
    planVersion: '2.0',
  }),
  runId: 'run-1',
  targetAdapter: 'mock' as const,
  selection: ['step_a'],
};

const CONTEXT = {
  principal: {
    principalId: 'user-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-03-14T00:00:00Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-14T00:00:00Z'),
};

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
            value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
          };
        },
      },
    } as never);

    const result = await useCase.execute(COMMAND, CONTEXT);

    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-1', accepted: true },
    });
    expect(calls).toEqual(['duplicate', 'admission', 'capacity', 'delegate', 'telemetry']);
  });

  it.each(EXECUTION_CAPACITY_REJECTION_CASES)(
    'returns system backpressure in enforce mode for execution-capacity reason=%s',
    async ({ reason, expectedCode, expectedRetryAfterSeconds }) => {
      const delegate = { execute: vi.fn() };
      const telemetry = { record: vi.fn().mockResolvedValue(undefined) };
      const useCase = new BackpressureAwareStartRunUseCase({
        duplicateProbe: {
          async findExisting() {
            return { kind: 'not_found' as const };
          },
        },
        admissionGuard: {
          async assertAdmissible() {
            return;
          },
        },
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
        delegate: delegate as never,
      } as never);

      const result = await useCase.execute(COMMAND, CONTEXT);

      expect(result).toEqual({
        ok: true,
        value: {
          kind: 'system_backpressure',
          accepted: false,
          code: expectedCode,
          retryAfterSeconds: expectedRetryAfterSeconds,
        },
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
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true },
      }),
    };
    const useCase = new BackpressureAwareStartRunUseCase({
      duplicateProbe: {
        async findExisting() {
          return { kind: 'not_found' as const };
        },
      },
      admissionGuard: {
        async assertAdmissible() {
          return;
        },
      },
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
    } as never);

    const result = await useCase.execute(COMMAND, CONTEXT);

    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-1', accepted: true },
    });
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
