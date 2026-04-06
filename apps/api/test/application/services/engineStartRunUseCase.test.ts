import {
  AdapterNotRegisteredError,
  OutboxRateLimitExceededError,
  RunExecutionContextRejectedError,
  RunAlreadyExistsError,
  UnsupportedPlanVersionError,
} from '@dvt/engine';
import { describe, it, expect } from 'vitest';

import type { AuthorizedCommandExecutionContext } from '../../../src/application/ports/authContract.js';
import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
  type StartRunCommand,
} from '../../../src/application/ports/startRunContract.js';
import { EngineStartRunUseCase } from '../../../src/application/services/engineStartRunUseCase.js';
import { TenantId, ProjectId, EnvironmentId } from '../../../src/domain/auth/types.js';

const PLAN_REF = {
  uri: 'https://plans.example.com/my-plan.json',
  sha256: 'deadbeef',
  schemaVersion: '1.0.0',
  planId: 'plan-123',
  planVersion: '3.0',
};

function mkContext(tenantId = 'tenant-1'): AuthorizedCommandExecutionContext {
  return {
    principal: {
      principalId: 'user-1',
      principalType: 'user',
      subjectId: 'sub-1',
      issuer: 'https://issuer.example/',
      audience: 'dvt-api',
      expiresAt: new Date(Date.now() + 3600000),
      rawScopes: [],
      assertedTenantIds: [],
      assertedProjectIds: [],
    },
    scope: {
      tenantId: TenantId.unsafe(tenantId),
      projectId: ProjectId.unsafe('proj-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    action: { kind: 'command', name: 'run:start' },
    requestId: 'req-test-1',
    authorizedAt: new Date(),
  };
}

function mkCommand(): StartRunCommand {
  return {
    planRef: PLAN_REF,
    runId: 'run-test-1',
    targetAdapter: 'mock',
    selection: ['step_a', 'step_b'],
  };
}

describe('EngineStartRunUseCase', () => {
  it('returns command_invalid result when planRef is missing', async () => {
    const useCase = new EngineStartRunUseCase({} as never);
    const commandWithoutPlanRef: StartRunCommand = {
      runId: 'run-test-1',
      targetAdapter: 'mock',
      selection: ['step_a'],
    };

    const result = await useCase.execute(commandWithoutPlanRef, mkContext());
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'command_invalid',
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
    });
  });

  it('calls engine.startRun with plan ref and run context', async () => {
    let capturedPlanRef: unknown;
    let capturedRunContext: unknown;

    const fakeEngine = {
      async startRun(planRef: unknown, runContext: unknown) {
        capturedPlanRef = planRef;
        capturedRunContext = runContext;
        return {
          provider: 'mock' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());

    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-test-1', accepted: true },
    });
    expect(capturedPlanRef).toEqual(PLAN_REF);
    expect(capturedRunContext).toEqual({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      runId: 'run-test-1',
      targetAdapter: 'mock',
    });
  });

  it('forwards planRef pluginCompatibilityFingerprint to engine boundary', async () => {
    let capturedPlanRef: unknown;
    const fakeEngine = {
      async startRun(planRef: unknown) {
        capturedPlanRef = planRef;
        return {
          provider: 'mock' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    await useCase.execute(
      {
        ...mkCommand(),
        planRef: {
          ...PLAN_REF,
          pluginCompatibilityFingerprint:
            '1111111111111111111111111111111111111111111111111111111111111111',
        },
      },
      mkContext()
    );

    expect(capturedPlanRef).toEqual({
      ...PLAN_REF,
      pluginCompatibilityFingerprint:
        '1111111111111111111111111111111111111111111111111111111111111111',
    });
  });

  it('passes runExecutionContextRef through to engine RunContext', async () => {
    let capturedRunContext: unknown;

    const fakeEngine = {
      async startRun(_planRef: unknown, runContext: unknown) {
        capturedRunContext = runContext;
        return {
          provider: 'mock' as const,
          tenantId: 'tenant-1',
          workflowId: 'wf-1',
          runId: 'run-test-1',
        };
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    await useCase.execute(
      {
        ...mkCommand(),
        runExecutionContextRef: {
          uri: 'dvt-runctx://tenant-1/run-test-1/context.json',
          sha256: 'ctxsha',
          schemaVersion: 'v1.0',
          planId: PLAN_REF.planId,
          planVersion: PLAN_REF.planVersion,
        },
      },
      mkContext()
    );

    expect(capturedRunContext).toEqual({
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      runId: 'run-test-1',
      targetAdapter: 'mock',
      runExecutionContextRef: {
        uri: 'dvt-runctx://tenant-1/run-test-1/context.json',
        sha256: 'ctxsha',
        schemaVersion: 'v1.0',
        planId: PLAN_REF.planId,
        planVersion: PLAN_REF.planVersion,
      },
    });
  });

  it('maps AdapterNotRegisteredError to typed engine error result', async () => {
    const fakeEngine = {
      async startRun() {
        throw new AdapterNotRegisteredError('mock');
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'adapter_not_registered',
        adapter: 'mock',
      },
    });
  });

  it('maps UnsupportedPlanVersionError to typed engine error result', async () => {
    const fakeEngine = {
      async startRun() {
        throw new UnsupportedPlanVersionError({
          planVersion: '9.0',
          supportedVersions: ['1.0'],
        });
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'unsupported_plan_version',
        planVersion: '9.0',
        supportedVersions: ['1.0'],
      },
    });
  });

  it('maps RunAlreadyExistsError to duplicate result', async () => {
    const fakeEngine = {
      async startRun() {
        throw new RunAlreadyExistsError('run-test-1');
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'duplicate',
        runId: 'run-test-1',
        accepted: true,
        duplicateOf: 'run',
      },
    });
  });

  it('maps INTENT_ACTIVE_CONFLICT to duplicate intent result', async () => {
    const fakeEngine = {
      async startRun() {
        throw Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' });
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'duplicate',
        runId: 'run-test-1',
        accepted: true,
        duplicateOf: 'intent',
      },
    });
  });

  it('maps OutboxRateLimitExceededError to rate-limited result', async () => {
    const fakeEngine = {
      async startRun() {
        throw new OutboxRateLimitExceededError('tenant-1');
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'rate_limited',
        accepted: false,
        code: 'OUTBOX_RATE_LIMIT_EXCEEDED',
      },
    });
  });

  it('maps RunExecutionContextRejectedError to plan_rejected result', async () => {
    const fakeEngine = {
      async startRun() {
        throw new RunExecutionContextRejectedError('tenant mismatch');
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    const result = await useCase.execute(mkCommand(), mkContext());
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason: 'engine.error.run_execution_context_rejected',
        cause: 'run_execution_context',
      },
    });
  });

  it('rethrows unexpected engine errors', async () => {
    const fakeEngine = {
      async startRun() {
        throw new Error('engine unavailable');
      },
    };

    const useCase = new EngineStartRunUseCase(fakeEngine as never);
    await expect(() => useCase.execute(mkCommand(), mkContext())).rejects.toThrow(
      /engine unavailable/
    );
  });
});
