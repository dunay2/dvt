/**
 * Owned concern: provide shared start-run admission test fixtures and doubles
 * for `BackpressureAwareStartRunUseCase` suites.
 */
import {
  parseExecutionSelection,
  parsePlanRef,
  START_RUN_RESULT_KIND,
  type StartRunAcceptedResult,
} from '@dvt/contracts';
import { expect, vi } from 'vitest';

import type {
  AdmissionTelemetry,
  AdmissionDecisionRecord,
} from '../../../src/application/ports/AdmissionTelemetry.js';
import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import type { DuplicateRunProbe } from '../../../src/application/ports/DuplicateRunProbe.js';
import type { IAdmissionGuard } from '../../../src/application/ports/IAdmissionGuard.js';
import type { IStartRunExecutionCapacityPort } from '../../../src/application/ports/IStartRunExecutionCapacityPort.js';
import type { IStartRunUseCase } from '../../../src/application/ports/startRunUseCasePort.js';
import { BackpressureAwareStartRunUseCase } from '../../../src/application/services/BackpressureAwareStartRunUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

export const COMMAND = {
  planRef: parsePlanRef({
    uri: 'https://plans.example.com/plan.json',
    sha256: 'deadbeef',
    schemaVersion: '1.0.0',
    planId: 'plan-1',
    planVersion: '2.0',
  }),
  runId: 'run-1',
  targetAdapter: 'temporal' as const,
  selection: parseExecutionSelection({
    mode: 'explicit',
    nodeIds: ['step_a'],
  }),
};

export const CONTEXT = {
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
    resource: 'environment',
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'req-1',
  authorizedAt: new Date('2026-03-14T00:00:00Z'),
} satisfies AuthorizedCommandExecutionContext;

export const ACCEPTED_RESULT = {
  kind: START_RUN_RESULT_KIND.accepted,
  runId: 'run-1',
  accepted: true,
} satisfies StartRunAcceptedResult;

export type StartRunUseCaseDeps = ConstructorParameters<typeof BackpressureAwareStartRunUseCase>[0];
export type StartRunExecutionResult = Awaited<ReturnType<BackpressureAwareStartRunUseCase['execute']>>;
export type DelegateSpy = IStartRunUseCase & {
  readonly execute: ReturnType<typeof vi.fn>;
};
export type TelemetrySpy = AdmissionTelemetry & {
  readonly record: ReturnType<typeof vi.fn>;
};
export type ExecuteWithoutDelegateOverrides = Omit<
  Partial<StartRunUseCaseDeps>,
  'delegate' | 'telemetry'
> & {
  readonly telemetry?: TelemetrySpy;
};

export function buildNotFoundDuplicateProbe(): DuplicateRunProbe {
  return {
    async findExisting() {
      return { kind: 'not_found' as const };
    },
  };
}

export function buildAllowingAdmissionGuard(): IAdmissionGuard {
  return {
    async assertAdmissible() {
      return;
    },
  };
}

export function buildAdmissibleExecutionCapacity(): IStartRunExecutionCapacityPort {
  return {
    async evaluate() {
      return { kind: 'admissible' as const };
    },
  };
}

export function buildNoopTelemetry(): AdmissionTelemetry {
  return {
    async record() {
      return undefined;
    },
  };
}

export function buildAcceptedDelegate(): IStartRunUseCase {
  return {
    async execute() {
      return {
        ok: true as const,
        value: ACCEPTED_RESULT,
      };
    },
  };
}

export function buildDelegateSpy(): DelegateSpy {
  return {
    execute: vi.fn(),
  };
}

export function buildTelemetrySpy(): TelemetrySpy {
  return {
    record: vi.fn<(_: AdmissionDecisionRecord) => Promise<void>>().mockResolvedValue(undefined),
  };
}

export function buildUseCase(
  overrides: Partial<StartRunUseCaseDeps> = {}
): BackpressureAwareStartRunUseCase {
  return new BackpressureAwareStartRunUseCase({
    duplicateProbe: buildNotFoundDuplicateProbe(),
    admissionGuard: buildAllowingAdmissionGuard(),
    executionCapacity: buildAdmissibleExecutionCapacity(),
    telemetry: buildNoopTelemetry(),
    mode: 'enforce',
    retryAfterSeconds: 30,
    delegate: buildAcceptedDelegate(),
    ...overrides,
  });
}

export async function executeWithoutDelegate(
  overrides: ExecuteWithoutDelegateOverrides = {}
): Promise<{
  readonly delegate: DelegateSpy;
  readonly result: StartRunExecutionResult;
  readonly telemetry: TelemetrySpy;
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

export function expectSuccessfulResult(result: StartRunExecutionResult, value: unknown): void {
  expect(result).toEqual({
    ok: true,
    value,
  });
}
