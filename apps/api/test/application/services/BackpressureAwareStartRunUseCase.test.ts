import { parsePlanRef } from '@dvt/contracts';
import {
  BackpressureSnapshotUnavailableError,
  SystemBackpressureError,
  TenantBackpressureError,
} from '@dvt/delivery';
import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
  START_RUN_RESULT_KIND,
} from '../../../src/application/ports/startRunResultContract.js';
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

const ADMISSIBLE_EXECUTION_CAPACITY = {
  async evaluate() {
    return { kind: 'admissible' as const };
  },
};

const ACCEPTED_RESULT = {
  kind: START_RUN_RESULT_KIND.accepted,
  runId: 'run-1',
  accepted: true,
} as const;

type StartRunUseCaseDeps = ConstructorParameters<typeof BackpressureAwareStartRunUseCase>[0];

type DelegateSpy = {
  readonly execute: ReturnType<typeof vi.fn>;
};

type TelemetrySpy = {
  readonly record: ReturnType<typeof vi.fn>;
};

type TelemetryOverride = StartRunUseCaseDeps['telemetry'] & TelemetrySpy;
type StartRunExecutionResult = Awaited<ReturnType<BackpressureAwareStartRunUseCase['execute']>>;

type ExecuteWithoutDelegateOverrides = Omit<
  Partial<StartRunUseCaseDeps>,
  'delegate' | 'telemetry'
> & {
  readonly telemetry?: TelemetryOverride;
};

function buildNotFoundDuplicateProbe(): StartRunUseCaseDeps['duplicateProbe'] {
  return {
    async findExisting() {
      return { kind: 'not_found' as const };
    },
  };
}

function buildNoopTelemetry(): StartRunUseCaseDeps['telemetry'] {
  return {
    async record() {
      return undefined;
    },
  };
}

function buildAcceptedDelegate(): StartRunUseCaseDeps['delegate'] {
  return {
    async execute() {
      return {
        ok: true as const,
        value: ACCEPTED_RESULT,
      };
    },
  };
}

function buildDelegateSpy(): StartRunUseCaseDeps['delegate'] & DelegateSpy {
  return {
    execute: vi.fn(),
  };
}

function buildTelemetrySpy(): TelemetryOverride {
  return {
    record: vi.fn().mockResolvedValue(undefined),
  };
}

function expectSuccessfulResult(result: StartRunExecutionResult, value: unknown): void {
  expect(result).toEqual({
    ok: true,
    value,
  });
}

function buildUseCase(
  overrides: Partial<StartRunUseCaseDeps> = {}
): BackpressureAwareStartRunUseCase {
  return new BackpressureAwareStartRunUseCase({
    duplicateProbe: buildNotFoundDuplicateProbe(),
    admissionGuard: {
      async assertAdmissible() {
        return;
      },
    },
    executionCapacity: ADMISSIBLE_EXECUTION_CAPACITY,
    telemetry: buildNoopTelemetry(),
    mode: 'enforce',
    retryAfterSeconds: 30,
    delegate: buildAcceptedDelegate(),
    ...overrides,
  });
}

async function executeWithoutDelegate(
  overrides: ExecuteWithoutDelegateOverrides = {}
): Promise<{
  readonly delegate: DelegateSpy;
  readonly result: StartRunExecutionResult;
  readonly telemetry: TelemetryOverride;
}> {
  const delegate = buildDelegateSpy();
  const telemetry = overrides.telemetry ?? buildTelemetrySpy();
  const useCase = buildUseCase({
    ...overrides,
    telemetry,
    delegate,
  });

  const result = await useCase.execute(COMMAND, CONTEXT);
  expect(delegate.execute).not.toHaveBeenCalled();

  return {
    delegate,
    result,
    telemetry,
  };
}

describe('BackpressureAwareStartRunUseCase', () => {
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
      } satisfies ExecuteWithoutDelegateOverrides,
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
      } satisfies ExecuteWithoutDelegateOverrides,
      expected: {
        kind: START_RUN_RESULT_KIND.systemBackpressure,
        accepted: false,
        code: START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
        retryAfterSeconds: 45,
      },
    },
  ] as const;

  it('runs duplicate probe before admission and delegate', async () => {
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
      executionCapacity: ADMISSIBLE_EXECUTION_CAPACITY,
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
    expectSuccessfulResult(result, { kind: 'accepted', runId: 'run-1', accepted: true });
    expect(calls).toEqual(['duplicate', 'admission', 'delegate', 'telemetry']);
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

  it.each(enforceModeBackpressureCases)('$description', async ({ overrides, expected }) => {
    const { result } = await executeWithoutDelegate(overrides);
    expectSuccessfulResult(result, expected);
  });

  it('observe mode records hypothetical reject and still delegates', async () => {
    const delegate: StartRunUseCaseDeps['delegate'] & DelegateSpy = {
      execute: vi.fn().mockResolvedValue({
        ok: true as const,
        value: {
          kind: 'accepted' as const,
          runId: 'run-1',
          accepted: true,
        },
      }),
    };
    const telemetry: TelemetryOverride = { record: vi.fn().mockResolvedValue(undefined) };
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

  describe('mode=off', () => {
    it('skips admission guard entirely', async () => {
      const admissionGuard = { assertAdmissible: vi.fn() };
      const useCase = buildUseCase({
        admissionGuard,
        mode: 'off',
      });

      await useCase.execute(COMMAND, CONTEXT);

      expect(admissionGuard.assertAdmissible).not.toHaveBeenCalled();
    });

    it('delegates to engine and records accept telemetry', async () => {
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
});
